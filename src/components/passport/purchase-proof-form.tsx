"use client";

import { useActionState, useState } from "react";
import { Button, FormError, FormNotice, TextareaField } from "@/components/ui";
import { putPhotoToS3 } from "@/components/listings/photo-upload-field";
import { savePurchaseProof } from "@/app/listings/[id]/passport/actions";
import { ALLOWED_PHOTO_CONTENT_TYPES } from "@/lib/listings";

/**
 * S2-36: one receipt or invoice photo, uploaded as it's picked under the
 * private passports/ prefix, plus an optional note. Renters never see it.
 */
export function PurchaseProofForm({ listingId }: { listingId: string }) {
  const [state, formAction, pending] = useActionState(savePurchaseProof.bind(null, listingId), undefined);
  const [photo, setPhoto] = useState<{ key: string; previewUrl: string }>();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>();
  const [note, setNote] = useState("");
  const [savedState, setSavedState] = useState(state);

  // A successful save clears the form for the next receipt.
  if (state !== savedState) {
    setSavedState(state);
    if (state?.saved) {
      setPhoto(undefined);
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
      setPhoto({ key: await putPhotoToS3(file, "passport"), previewUrl: URL.createObjectURL(file) });
    } catch (caught) {
      setUploadError(caught instanceof Error ? caught.message : `${file.name} failed to upload.`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="photo_key" value={photo?.key ?? ""} />
      <label className="block w-40 cursor-pointer">
        <span className="sr-only">Receipt photo</span>
        <span className="flex aspect-square items-center justify-center border border-dashed border-line bg-surface-muted text-xs text-ink-soft">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local blob: preview
            <img src={photo.previewUrl} alt="Receipt" className="h-full w-full object-contain" />
          ) : uploading ? (
            "Uploading…"
          ) : (
            "Add receipt photo"
          )}
        </span>
        <input
          type="file"
          accept={ALLOWED_PHOTO_CONTENT_TYPES.join(",")}
          className="sr-only"
          disabled={uploading}
          onChange={(event) => {
            void upload(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </label>
      <FormError message={uploadError} />
      <TextareaField
        label="Note (optional)"
        id="proof-note"
        name="note"
        maxLength={1000}
        rows={2}
        placeholder="e.g. Bought new at Swee Lee, March 2024."
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <FormError message={state?.error} />
      {state?.saved && <FormNotice tone="success" message="Proof of purchase added to the passport." />}
      <Button disabled={pending || uploading || !photo}>{pending ? "Saving…" : "Add proof of purchase"}</Button>
    </form>
  );
}
