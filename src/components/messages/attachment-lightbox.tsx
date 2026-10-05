"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const ZOOM_STEP = 0.5;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

type DragState = { pointerId: number; startX: number; startY: number; originX: number; originY: number };

/**
 * Full-screen viewer for a delivered message attachment (S2-17), opened by
 * clicking its thumbnail in the thread. Unlike AttachmentCropModal this
 * never produces a file - it only displays the image already sent, zoomed
 * and panned for a closer look, never edited.
 *
 * Pan bounds come from the image's own live getBoundingClientRect() (which
 * already reflects the current CSS scale) rather than pre-computing a
 * rendered size from natural dimensions the way the crop modals do - there's
 * no fixed square/aspect viewport to fit here, just "don't let the edges
 * pull in short of the screen's edges".
 */
export function AttachmentLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  const [scale, setScale] = useState(MIN_SCALE);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragRef = useRef<DragState | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function zoomTo(next: number) {
    const clamped = clamp(next, MIN_SCALE, MAX_SCALE);
    setScale(clamped);
    // Back at the fitted size, any pan offset would leave the image
    // off-center with nothing to clamp it - reset rather than let that show.
    if (clamped === MIN_SCALE) setPosition({ x: 0, y: 0 });
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    zoomTo(scale - event.deltaY * 0.01);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLImageElement>) {
    if (scale === MIN_SCALE) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: position.x, originY: position.y };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLImageElement>) {
    const drag = dragRef.current;
    const bounds = imageRef.current?.getBoundingClientRect();
    if (!drag || drag.pointerId !== event.pointerId || !bounds) return;
    // How far the image (already rendered at the current scale) can move
    // before its edge would pull in from the screen's edge.
    const maxX = Math.max(0, (bounds.width - window.innerWidth) / 2);
    const maxY = Math.max(0, (bounds.height - window.innerHeight) / 2);
    setPosition({
      x: clamp(drag.originX + (event.clientX - drag.startX), -maxX, maxX),
      y: clamp(drag.originY + (event.clientY - drag.startY), -maxY, maxY),
    });
  }

  function endDrag(event: ReactPointerEvent<HTMLImageElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Attachment viewer"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      onWheel={handleWheel}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a short-lived presigned S3 URL, not an optimizable remote image */}
      <img
        ref={imageRef}
        src={url}
        alt=""
        draggable={false}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={`max-h-full max-w-full touch-none select-none object-contain ${scale > MIN_SCALE ? "cursor-grab active:cursor-grabbing" : ""}`}
        style={{ transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)` }}
      />

      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/10 px-3 py-2 backdrop-blur">
        <button
          type="button"
          aria-label="Zoom out"
          disabled={scale <= MIN_SCALE}
          onClick={() => zoomTo(scale - ZOOM_STEP)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-white disabled:opacity-40"
        >
          <ZoomOut className="size-4" aria-hidden="true" />
        </button>
        <span className="min-w-[3ch] text-center text-xs text-white">{Math.round(scale * 100)}%</span>
        <button
          type="button"
          aria-label="Zoom in"
          disabled={scale >= MAX_SCALE}
          onClick={() => zoomTo(scale + ZOOM_STEP)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-white disabled:opacity-40"
        >
          <ZoomIn className="size-4" aria-hidden="true" />
        </button>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur"
      >
        <X className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}
