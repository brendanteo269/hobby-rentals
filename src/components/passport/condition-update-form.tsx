"use client";

import { useActionState, useState } from "react";
import { Button, FormError, FormNotice, TextareaField } from "@/components/ui";
import { putPhotoToS3 } from "@/components/listings/photo-upload-field";
import { saveConditionUpdate } from "@/app/listings/[id]/passport/actions";
import { ALLOWED_PHOTO_CONTENT_TYPES, MAX_CONDITION_UPDATE_PHOTOS } from "@/lib/listings";

type Photo = { key: string; previewUrl: string };

/**
 * S2-31: the owner records a change between rentals ("replaced strings").
 * Photos upload as they're picked, under the private passports/ prefix, like
 * the serial photo. Appended to the passport, so the baseline stays as it was.
 */
export function ConditionUpdateForm({ listingId }: { listingId: string }) {
  const [state, formAction, pending] = useActionState(saveConditionUpdate.bind(null, listingId), undefined);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>();
  const [note, setNote] = useState("");
  const [savedState, setSavedState] = useState(state);

  // A successful save clears the form for the next update.
  if (state !== savedState) {
    setSavedState(state);
    if (state?.saved) {
      setPhotos([]);
      setNote("");
    }
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!ALLOWED_PHOTO_CONTENT_TYPES.includes(file.type as (typeof ALLOWED_PHOTO_CONTENT_TYPES)[number])) {
      setUploadError(`${file.name}: unsupported file type. Use JPEG, PNG or WebP.`);
      return;
    }
    setUploadError(undefined);
    setUploading(true);
    try {
      const key = await putPhotoToS3(file, "passport");
      setPhotos((current) => [...current, { key, previewUrl: URL.createObjectURL(file) }]);
    } catch (caught) {
      setUploadError(caught instanceof Error ? caught.message : `${file.name} failed to upload.`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="photo_keys" value={JSON.stringify(photos.map((photo) => photo.key))} />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {photos.map((photo, index) => (
          <li key={photo.key} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- a local blob: preview */}
            <img src={photo.previewUrl} alt={`Photo ${index + 1}`} className="aspect-square w-full border border-line object-cover" />
            <button
              type="button"
              onClick={() => setPhotos((current) => current.filter((p) => p.key !== photo.key))}
              className="mt-1 text-xs text-ink-soft underline underline-offset-4"
            >
              Remove
            </button>
          </li>
        ))}
        {photos.length < MAX_CONDITION_UPDATE_PHOTOS && (
          <li>
            <label className="flex aspect-square cursor-pointer items-center justify-center border border-dashed border-line bg-surface-muted text-xs text-ink-soft">
              {uploading ? "Uploading…" : "Add photo"}
              <input
                type="file"
                accept={ALLOWED_PHOTO_CONTENT_TYPES.join(",")}
                capture="environment"
                className="sr-only"
                disabled={uploading}
                onChange={(event) => {
                  void upload(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          </li>
        )}
      </ul>
      <FormError message={uploadError} />
      <TextareaField
        label="What changed?"
        id="note"
        name="note"
        maxLength={1000}
        required
        rows={3}
        placeholder="e.g. Replaced the strings and cleaned the fretboard."
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <FormError message={state?.error} />
      {state?.saved && <FormNotice tone="success" message="Condition update added to the passport." />}
      <Button disabled={pending || uploading || photos.length === 0}>{pending ? "Saving…" : "Add condition update"}</Button>
    </form>
  );
}
