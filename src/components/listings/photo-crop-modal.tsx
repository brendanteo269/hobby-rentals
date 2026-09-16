"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Button, Modal } from "@/components/ui";
import type { CropTransform } from "@/lib/image-crop";

/** The square preview's CSS size in px - also what a saved crop visually represents, since every ImageSlot card renders these photos at aspect-square too. */
const VIEWPORT = 320;
const MAX_SCALE = 3;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

type DragState = { pointerId: number; startX: number; startY: number; cropX: number; cropY: number };

/**
 * Pan/zoom editor for one photo's original, uncropped file.
 *
 * Pure UI - it only reports the chosen CropTransform back via `onSave`.
 * PhotoUploadField owns turning that into pixels (cropBitmapToFile) and
 * re-uploading, the same way it already owns the initial upload.
 */
export function PhotoCropModal({
  file,
  initialCrop,
  onCancel,
  onSave,
}: {
  file: File;
  initialCrop: CropTransform;
  onCancel: () => void;
  onSave: (crop: CropTransform) => void;
}) {
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [crop, setCrop] = useState(initialCrop);
  // Created inside the effect, not via a useState lazy initializer: Strict
  // Mode's dev-only double-invoke (mount -> cleanup -> mount again) would
  // otherwise revoke the one-and-only URL created outside the effect on its
  // synthetic first "unmount", leaving <img src> pointed at a dead blob URL
  // that never fires onLoad. Creating it inside means the double-invoke
  // creates and revokes a *throwaway* first URL, and the second mount's URL
  // is the one that survives to be used and is the one actually cleaned up.
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    // Creating the URL inside the effect (rather than useMemo, which
    // wouldn't re-run on Strict Mode's cleanup) is the point: it's what
    // makes the *second* Strict Mode invocation mint a fresh, un-revoked URL
    // instead of reusing one the first invocation's cleanup already killed.
    // See the comment on the objectUrl declaration above.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const rendered = naturalSize && renderedSize(naturalSize, crop.scale);
  const travelX = rendered ? maxTravel(rendered.width) : 0;
  const travelY = rendered ? maxTravel(rendered.height) : 0;

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
      // Dragging the image right (positive delta) reveals source content to
      // its left, i.e. the crop window's x decreases - opposite sign from
      // the pointer delta.
      x: travelX === 0 ? 0 : clamp(drag.cropX - deltaX / travelX, -1, 1),
      y: travelY === 0 ? 0 : clamp(drag.cropY - deltaY / travelY, -1, 1),
    }));
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  return (
    <Modal title="Adjust photo" onClose={onCancel}>
      <div className="mt-5">
        <div
          className="relative mx-auto touch-none overflow-hidden rounded-lg bg-surface-muted"
          style={{ width: VIEWPORT, height: VIEWPORT }}
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
              Couldn&apos;t open this photo for editing.
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
        <p className="body-copy mt-2 text-center">Drag the photo to reposition it, or use the slider to zoom.</p>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" disabled={!naturalSize} onClick={() => onSave(crop)}>
          Save crop
        </Button>
      </div>
    </Modal>
  );
}

/** The image's CSS size at `scale` such that, at scale 1, its shorter side exactly fills the square viewport (cover-fit) - matches cropBitmapToFile's math so what's previewed is what gets exported. */
function renderedSize(natural: { width: number; height: number }, scale: number): { width: number; height: number } {
  const factor = (VIEWPORT / Math.min(natural.width, natural.height)) * scale;
  return { width: natural.width * factor, height: natural.height * factor };
}

/** How far the image can pan (in either direction) before its edge would show inside the viewport. */
function maxTravel(renderedDimension: number): number {
  return Math.max(0, (renderedDimension - VIEWPORT) / 2);
}
