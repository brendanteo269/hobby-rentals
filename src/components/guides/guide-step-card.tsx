"use client";

import { useRef } from "react";
import { ArrowDown, ArrowUp, ImagePlus, X } from "lucide-react";
import { Button, TextareaField } from "@/components/ui";
import { putPhotoToS3 } from "@/components/listings/photo-upload-field";
import { ALLOWED_PHOTO_CONTENT_TYPES } from "@/lib/listings";
import { MAX_GUIDE_STEP_CHARS } from "@/lib/guides";

/** One step as the owner is editing it. */
export type DraftStep = {
  /** React's key only; never sent. */
  id: string;
  text: string;
  photoKey: string | null;
  /** A local blob: URL for a photo picked now, or the stored photo's signed URL. */
  photoUrl: string | null;
  uploading: boolean;
  uploadError: string | null;
};

/** Only blob: URLs are ours to free; a stored photo's URL belongs to S3. */
export function releasePreview(url: string | null) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

/**
 * One numbered step: its text, an optional photo and the controls to move or
 * remove it. Submits as steps.N.text and steps.N.photo_key, N being its place.
 *
 * The photo is uploaded the moment it is picked, under the private guides/
 * prefix, and kept uncropped - an instruction photo (a knot, a wiring
 * diagram) needs its whole frame, unlike a listing's square thumbnails.
 */
export function GuideStepCard({
  step,
  index,
  count,
  error,
  onChange,
  onMove,
  onRemove,
}: {
  step: DraftStep;
  index: number;
  count: number;
  /** Messages for this step, keyed "text" and "photo_key". */
  error: { text?: string; photo_key?: string };
  onChange: (patch: Partial<DraftStep>) => void;
  onMove: (offset: -1 | 1) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const number = index + 1;

  async function upload(file: File | undefined) {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    if (!ALLOWED_PHOTO_CONTENT_TYPES.includes(file.type as (typeof ALLOWED_PHOTO_CONTENT_TYPES)[number])) {
      onChange({ uploadError: "Use a JPEG, PNG or WebP photo." });
      return;
    }
    onChange({ uploading: true, uploadError: null });
    try {
      const photoKey = await putPhotoToS3(file, "guide");
      releasePreview(step.photoUrl);
      onChange({ photoKey, photoUrl: URL.createObjectURL(file), uploading: false });
    } catch (caught) {
      onChange({ uploading: false, uploadError: caught instanceof Error ? caught.message : "The photo failed to upload. Try again." });
    }
  }

  return (
    <li className="rounded-xl border border-line p-4">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-7 flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white"
        >
          {number}
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <TextareaField
            label={`Step ${number}`}
            id={`step-${step.id}`}
            name={`steps.${index}.text`}
            rows={3}
            required
            maxLength={MAX_GUIDE_STEP_CHARS}
            value={step.text}
            onChange={(event) => onChange({ text: event.target.value })}
            placeholder={number === 1 ? "e.g. Lay the footprint flat, shiny side up." : undefined}
            hint={`${step.text.length}/${MAX_GUIDE_STEP_CHARS}`}
            error={error.text}
          />
          <input type="hidden" name={`steps.${index}.photo_key`} value={step.photoKey ?? ""} />

          {step.photoUrl && (
            <div className="relative w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element -- a local blob: URL or a short-lived presigned S3 URL; neither is an optimizable remote image */}
              <img src={step.photoUrl} alt={`Step ${number}`} className="max-h-48 rounded-lg border border-line object-contain" />
              <button
                type="button"
                onClick={() => {
                  releasePreview(step.photoUrl);
                  onChange({ photoKey: null, photoUrl: null });
                }}
                aria-label={`Remove the photo from step ${number}`}
                className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-ink/80 text-white"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={ALLOWED_PHOTO_CONTENT_TYPES.join(",")}
              className="hidden"
              onChange={(event) => void upload(event.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              className="gap-1.5 px-3 py-1.5 text-xs"
              disabled={step.uploading}
              onClick={() => inputRef.current?.click()}
            >
              <ImagePlus className="size-3.5" aria-hidden="true" />
              {step.uploading ? "Uploading…" : step.photoUrl ? "Replace photo" : "Add photo"}
            </Button>
            <span className="text-xs text-ink-soft">Optional</span>
            <div className="ml-auto flex gap-1">
              <Button type="button" variant="outline" className="px-2 py-1.5" disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Move step ${number} up`}>
                <ArrowUp className="size-3.5" aria-hidden="true" />
              </Button>
              <Button type="button" variant="outline" className="px-2 py-1.5" disabled={index === count - 1} onClick={() => onMove(1)} aria-label={`Move step ${number} down`}>
                <ArrowDown className="size-3.5" aria-hidden="true" />
              </Button>
              <Button type="button" variant="outline" className="px-3 py-1.5 text-xs" disabled={count === 1} onClick={onRemove}>
                Remove step
              </Button>
            </div>
          </div>
          {(step.uploadError ?? error.photo_key) && (
            <p role="alert" className="text-xs text-accent-dark">
              {step.uploadError ?? error.photo_key}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}
