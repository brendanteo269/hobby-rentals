/**
 * Client-side square cropping for listing photos, shared by the instant
 * auto-crop on upload (PhotoUploadField) and the manual pan/zoom editor
 * (PhotoCropModal) so there is exactly one place that turns a bitmap plus a
 * transform into pixels, rather than two slightly different implementations.
 */

/**
 * x, y: normalized pan offset in [-1, 1] at the current scale (0, 0 = the
 * crop window centered on the source image).
 * scale: >= 1. 1 is the auto-crop - the full shorter side, no zoom.
 */
export type CropTransform = { x: number; y: number; scale: number };

export const CENTERED_CROP: CropTransform = { x: 0, y: 0, scale: 1 };

/**
 * Draws the region of `bitmap` selected by `crop` onto a fresh square
 * canvas and encodes it as `mimeType`.
 *
 * Always at native resolution: the source rectangle shrinks as scale grows
 * rather than the canvas being scaled, so this never resamples (no
 * up/down-sampling blur), and source coordinates are floored rather than
 * left fractional - a fractional source offset forces the browser to
 * bilinearly blend across pixel boundaries even at 1:1 scale, which is what
 * actually caused the original auto-crop blur.
 */
export async function cropBitmapToFile(
  bitmap: ImageBitmap,
  crop: CropTransform,
  mimeType: string,
  fileName: string,
): Promise<File | null> {
  const minSide = Math.min(bitmap.width, bitmap.height);
  const sSide = Math.round(minSide / crop.scale);
  const maxOffsetX = (bitmap.width - sSide) / 2;
  const maxOffsetY = (bitmap.height - sSide) / 2;
  const sx = Math.floor(maxOffsetX + crop.x * maxOffsetX);
  const sy = Math.floor(maxOffsetY + crop.y * maxOffsetY);

  const canvas = document.createElement("canvas");
  canvas.width = sSide;
  canvas.height = sSide;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(bitmap, sx, sy, sSide, sSide, 0, 0, sSide, sSide);

  // 0.95: any canvas re-encode of a JPEG/WebP is already a second
  // generation of lossy compression on top of the original file's own - this
  // only controls how much additional loss that second pass adds. PNG
  // (lossless) ignores the argument entirely.
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, 0.95));
  if (!blob) return null;

  return new File([blob], fileName, { type: mimeType });
}

/**
 * Decodes `file` and center-crops it to a square - the default every photo
 * gets the instant it's picked, before the owner ever opens the manual
 * editor.
 *
 * Falls back to the original file if decoding/canvas fails for any reason
 * (unsupported browser, decode error) - a slightly off-center crop from
 * object-cover beats blocking the upload entirely.
 */
export async function cropToSquare(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

    if (bitmap.width === bitmap.height) {
      bitmap.close();
      return file;
    }

    const cropped = await cropBitmapToFile(bitmap, CENTERED_CROP, file.type, file.name);
    bitmap.close();
    return cropped ?? file;
  } catch {
    return file;
  }
}
