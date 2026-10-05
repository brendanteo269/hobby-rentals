"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import ReactCrop, { centerCrop, cropToCanvas, type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button, Modal } from "@/components/ui";

/**
 * Review-and-crop step for one message attachment, shown before it uploads
 * (S2-17). Uses react-image-crop - the standard drag-the-corners crop
 * rectangle, not a bespoke pan/zoom control - with no fixed aspect ratio, so
 * cropping a condition photo or handover spot doesn't force it to a square
 * the way a listing's thumbnail grid does. Nothing is uploaded until "Use
 * photo" is pressed: this modal *is* the review.
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
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isSaving, setIsSaving] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Starts the crop rectangle covering most of the image (a sensible
  // default selection) rather than empty, so there's something to confirm
  // or adjust immediately instead of having to draw one from scratch.
  function onImageLoad(event: SyntheticEvent<HTMLImageElement>) {
    const { width, height } = event.currentTarget;
    setCrop(centerCrop({ unit: "%", width: 90, height: 90, x: 5, y: 5 }, width, height));
  }

  async function confirm() {
    const image = imageRef.current;
    if (!completedCrop || !image || completedCrop.width === 0 || completedCrop.height === 0) {
      onConfirm(file);
      return;
    }
    setIsSaving(true);
    try {
      const canvas = document.createElement("canvas");
      await cropToCanvas(image, canvas, completedCrop);
      // 0.95: any canvas re-encode of a JPEG/WebP is already a second
      // generation of lossy compression on top of the original file's own -
      // this only controls how much additional loss that second pass adds.
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, file.type, 0.95));
      onConfirm(blob ? new File([blob], file.name, { type: file.type }) : file);
    } catch {
      // Cropping is a client-side nicety; if the canvas pipeline fails for
      // any reason, attaching the original picked file beats blocking the
      // send entirely.
      onConfirm(file);
    }
  }

  return (
    <Modal title="Review photo" onClose={onCancel}>
      <div className="mt-5 flex justify-center">
        {objectUrl && (
          <ReactCrop crop={crop} onChange={(_, percentCrop) => setCrop(percentCrop)} onComplete={(c) => setCompletedCrop(c)}>
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob: URL being actively cropped, not an optimizable remote image */}
            <img ref={imageRef} src={objectUrl} alt="" onLoad={onImageLoad} className="max-h-[55vh] max-w-full" />
          </ReactCrop>
        )}
      </div>
      <p className="body-copy mt-3 text-center">Drag the corners to adjust the crop.</p>

      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" disabled={isSaving} onClick={() => void confirm()}>
          {isSaving ? "Preparing…" : "Use photo"}
        </Button>
      </div>
    </Modal>
  );
}
