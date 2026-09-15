"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui";
import {
  ALLOWED_PHOTO_CONTENT_TYPES,
  MAX_LISTING_PHOTOS,
  type PresignPhotoResponse,
} from "@/lib/listings";

type Photo = {
  key: string;
  /** Local object URL for the thumbnail — never sent anywhere, revoked on removal/unmount. */
  previewUrl: string;
  fileName: string;
};

type UploadingSlot = { id: string; fileName: string };

/**
 * Photo picker for the create-listing form.
 *
 * Each file is uploaded to S3 the moment it's picked, not on form submit:
 * the field asks the backend for a presigned URL (via the same-origin
 * /api/listings/photos/presign route, since presigning needs the Supabase
 * session and that lookup is server-only) and PUTs the file straight to S3
 * from the browser. What the surrounding form actually submits is just the
 * resulting photo_keys, serialised into one hidden field — the same pattern
 * BlackoutRulesField uses for its list.
 */
export function PhotoUploadField({ error }: { error?: string }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState<UploadingSlot[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const remainingSlots = MAX_LISTING_PHOTOS - photos.length - uploading.length;

  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError(null);

    const selected = Array.from(files).slice(0, Math.max(remainingSlots, 0));
    if (selected.length < files.length) {
      setUploadError(`Up to ${MAX_LISTING_PHOTOS} photos per listing.`);
    }

    for (const file of selected) {
      if (!ALLOWED_PHOTO_CONTENT_TYPES.includes(file.type as (typeof ALLOWED_PHOTO_CONTENT_TYPES)[number])) {
        setUploadError(`${file.name}: unsupported file type. Use JPEG, PNG or WebP.`);
        continue;
      }
      void uploadOne(file);
    }

    // Cleared so picking the same file again (after removing it) re-fires onChange.
    if (inputRef.current) inputRef.current.value = "";
  }

  async function uploadOne(file: File) {
    const slot: UploadingSlot = { id: crypto.randomUUID(), fileName: file.name };
    setUploading((current) => [...current, slot]);

    try {
      const presignRes = await fetch("/api/listings/photos/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_type: file.type }),
      });
      if (!presignRes.ok) {
        const body: unknown = await presignRes.json().catch(() => null);
        const message =
          body !== null && typeof body === "object" && "error" in body
            ? String((body as { error: unknown }).error)
            : "Could not prepare the upload.";
        throw new Error(message);
      }
      const { upload_url, photo_key } = (await presignRes.json()) as PresignPhotoResponse;

      const putRes = await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) {
        throw new Error(`${file.name} failed to upload. Try again.`);
      }

      setPhotos((current) => [
        ...current,
        { key: photo_key, previewUrl: URL.createObjectURL(file), fileName: file.name },
      ]);
    } catch (caught) {
      setUploadError(caught instanceof Error ? caught.message : `${file.name} failed to upload.`);
    } finally {
      setUploading((current) => current.filter((item) => item.id !== slot.id));
    }
  }

  function removePhoto(key: string) {
    setPhotos((current) => {
      const target = current.find((photo) => photo.key === key);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((photo) => photo.key !== key);
    });
  }

  return (
    <fieldset className="border border-line bg-white p-5">
      <legend className="px-2 text-sm font-medium">
        Photos<span aria-hidden="true" className="text-clay"> *</span>
      </legend>
      <p className="body-copy">
        At least one is required. Up to {MAX_LISTING_PHOTOS}, JPEG/PNG/WebP.
      </p>

      <input type="hidden" name="photo_keys" value={JSON.stringify(photos.map((p) => p.key))} />

      {(photos.length > 0 || uploading.length > 0) && (
        <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {photos.map((photo) => (
            <li key={photo.key} className="group relative aspect-square overflow-hidden border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob: URL, not an optimizable remote image */}
              <img src={photo.previewUrl} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(photo.key)}
                aria-label={`Remove ${photo.fileName}`}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink/80 text-xs text-cream opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                ×
              </button>
            </li>
          ))}
          {uploading.map((slot) => (
            <li
              key={slot.id}
              className="flex aspect-square items-center justify-center border border-dashed border-line bg-sand text-xs text-ink-soft"
            >
              Uploading…
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 border-t border-line pt-4">
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_PHOTO_CONTENT_TYPES.join(",")}
          multiple
          disabled={remainingSlots <= 0}
          onChange={(event) => void handleFilesSelected(event.target.files)}
          className="hidden"
          id="photo_upload_input"
        />
        <Button
          type="button"
          variant="outline"
          disabled={remainingSlots <= 0}
          onClick={() => inputRef.current?.click()}
        >
          Add photos
        </Button>
      </div>

      {uploadError && (
        <p role="alert" className="mt-3 text-xs text-clay">
          {uploadError}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-xs text-clay">
          {error}
        </p>
      )}
    </fieldset>
  );
}
