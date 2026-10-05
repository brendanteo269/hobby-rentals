"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Button, Modal } from "@/components/ui";
import { CENTERED_CROP, cropBitmapKeepingAspect, type CropTransform } from "@/lib/image-crop";

/** The crop viewport's largest dimension in px - the image's own aspect ratio determines the other. */
const MAX_VIEWPORT = 360;
const MAX_SCALE = 3;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

type DragState = { pointerId: number; startX: number; startY: number; cropX: number; cropY: number };

/**
 * Review-and-crop step for one message attachment, shown before it uploads
 * (S2-17) - pan/zoom like PhotoUploadField's PhotoCropModal, but the crop
 * window keeps the photo's own aspect ratio instead of forcing a square, and
 * there is no separate auto-crop-on-pick: this modal *is* the review, and
 * nothing is uploaded until "Use photo" is pressed.
 */
export function AttachmentCropModal({
  file,
  onCancel,
  onConfirm,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (cropped: File) => void;
}) {
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [crop, setCrop] = useState<CropTransform>(CENTERED_CROP);
  const [isSaving, setIsSaving] = useState(false);
  // See PhotoCropModal's identical comment: created inside the effect so
  // Strict Mode's dev-only double-invoke revokes a throwaway first URL
  // rather than the one actually rendered.
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // The viewport fits within an MAX_VIEWPORT square at the image's own
  // aspect ratio, so a landscape photo gets a wide-short viewport and a
  // portrait one a narrow-tall viewport, matching what crop.scale 1 (the
  // whole image, nothing cut off) actually looks like.
  const viewport =
    naturalSize &&
    (() => {
      const factor = Math.min(MAX_VIEWPORT / naturalSize.width, MAX_VIEWPORT / naturalSize.height);
      return { width: naturalSize.width * factor, height: naturalSize.height * factor };
    })();

  const rendered = viewport && { width: viewport.width * crop.scale, height: viewport.height * crop.scale };
  const travelX = rendered && viewport ? maxTravel(rendered.width, viewport.width) : 0;
  const travelY = rendered && viewport ? maxTravel(rendered.height, viewport.height) : 0;

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, cropX: crop.x, cropY: crop.y };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    setCrop((current) => ({
      ...current,
      x: travelX === 0 ? 0 : clamp(drag.cropX - deltaX / travelX, -1, 1),
      y: travelY === 0 ? 0 : clamp(drag.cropY - deltaY / travelY, -1, 1),
    }));
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  async function confirm() {
    setIsSaving(true);
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      const cropped = await cropBitmapKeepingAspect(bitmap, crop, file.type, file.name);
      bitmap.close();
      onConfirm(cropped ?? file);
    } catch {
      // Cropping is a client-side nicety; if the canvas pipeline fails for
      // any reason, attaching the original picked file beats blocking the
      // send entirely.
      onConfirm(file);
    }
  }

  return (
    <Modal title="Review photo" onClose={onCancel}>
      <div className="mt-5">
        <div
          className="relative mx-auto touch-none overflow-hidden rounded-lg bg-surface-muted"
          style={viewport ? { width: viewport.width, height: viewport.height } : { width: MAX_VIEWPORT, height: MAX_VIEWPORT }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {!naturalSize && !loadError && (
            <p className="flex h-full items-center justify-center text-xs text-ink-soft">Loading…</p>
          )}
          {loadError && (
            <p className="flex h-full items-center justify-center px-4 text-center text-xs text-accent-dark">
              Couldn&apos;t open this photo.
            </p>
          )}
          {objectUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- local blob: URL being actively repositioned, not an optimizable remote image
            <img
              src={objectUrl}
              alt=""
              draggable={false}
              onLoad={(event) =>
                setNaturalSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })
              }
              onError={() => setLoadError(true)}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
              style={
                rendered
                  ? {
                      width: rendered.width,
                      height: rendered.height,
                      transform: `translate(-50%, -50%) translate(${-crop.x * travelX}px, ${-crop.y * travelY}px)`,
                    }
                  : { opacity: 0 }
              }
            />
          )}
        </div>

        <input
          type="range"
          min={1}
          max={MAX_SCALE}
          step={0.01}
          value={crop.scale}
          onChange={(event) => setCrop((current) => ({ ...current, scale: Number(event.target.value) }))}
          aria-label="Zoom"
          className="mt-4 w-full"
        />
        <p className="body-copy mt-2 text-center">Drag to reposition, or use the slider to zoom in.</p>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" disabled={!naturalSize || isSaving} onClick={() => void confirm()}>
          {isSaving ? "Preparing…" : "Use photo"}
        </Button>
      </div>
    </Modal>
  );
}

/** How far the image can pan (in either direction) before its edge would show inside the viewport, on one axis. */
function maxTravel(renderedDimension: number, viewportDimension: number): number {
  return Math.max(0, (renderedDimension - viewportDimension) / 2);
}
