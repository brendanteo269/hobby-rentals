"use client";

import { useRef, useState } from "react";
import { Crop } from "lucide-react";
import { Button, RequiredMark } from "@/components/ui";
import {
  ALLOWED_PHOTO_CONTENT_TYPES,
  MAX_LISTING_PHOTOS,
  type PresignPhotoResponse,
} from "@/lib/listings";
import { CENTERED_CROP, cropBitmapToFile, cropToSquare, type CropTransform } from "@/lib/image-crop";
import { PhotoCropModal } from "./photo-crop-modal";

type Photo = {
  key: string;
  /**
   * What the thumbnail shows: a local blob: URL for a photo picked in this
   * session (revoked on removal), or the stored photo's own URL when editing.
   */
  previewUrl: string;
  fileName: string;
  /**
   * Untouched original, kept so "Edit crop" can re-crop from the full photo
   * rather than re-cropping an already-cropped square. Null for a photo that
   * was already on the listing: the browser never had its file, so it can be
   * removed but not re-cropped.
   */
  originalFile: File | null;
  /** The crop last applied, so reopening the editor starts where the owner left it instead of resetting to center. */
  crop: CropTransform;
};

/** A photo already on the listing being edited, as the API returns it. */
export type StoredPhoto = { key: string; url: string };

/** Only blob: URLs are ours to free; a stored photo's URL belongs to S3. */
function releasePreview(url: string) {
  if (url.startsWith("blob:")) URL.revokeObjectURL(url);
}

type UploadingSlot = { id: string; fileName: string };

/**
 * Presigns and PUTs one file to S3, returning the resulting photo_key.
 * Shared by the initial upload and the re-crop-then-reupload path so the
 * presign protocol and its error handling live in exactly one place.
 */
async function putPhotoToS3(file: File): Promise<string> {
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
  return photo_key;
}

/**
 * Photo picker for the listing form, create and edit alike.
 *
 * Each file is uploaded to S3 the moment it's picked, not on form submit:
 * the field asks the backend for a presigned URL (via the same-origin
 * /api/listings/photos/presign route, since presigning needs the Supabase
 * session and that lookup is server-only) and PUTs the file straight to S3
 * from the browser. What the surrounding form actually submits is just the
 * resulting photo_keys, serialised into one hidden field — the same pattern
 * BlackoutRulesField uses for its list.
 *
 * When editing, the listing's existing photos are seeded in from
 * initialPhotos. Removing one only drops its key from the submitted list;
 * the object stays in S3, since a booking or passport record may still point
 * at it.
 */
export function PhotoUploadField({
  error,
  initialPhotos = [],
}: {
  error?: string;
  initialPhotos?: StoredPhoto[];
}) {
  const [photos, setPhotos] = useState<Photo[]>(() =>
    initialPhotos.map((photo) => ({
      key: photo.key,
      previewUrl: photo.url,
      fileName: photo.key.slice(photo.key.lastIndexOf("/") + 1),
      originalFile: null,
      crop: CENTERED_CROP,
    })),
  );
  const [uploading, setUploading] = useState<UploadingSlot[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // The photo currently open in the manual crop editor, if any.
  const [editing, setEditing] = useState<Photo | null>(null);
  // Key of the photo currently being re-cropped and re-uploaded, so its tile
  // can show the same "in progress" treatment a fresh upload gets.
  const [recroppingKey, setRecroppingKey] = useState<string | null>(null);
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
      const squared = await cropToSquare(file);
      const photo_key = await putPhotoToS3(squared);

      setPhotos((current) => [
        ...current,
        {
          key: photo_key,
          previewUrl: URL.createObjectURL(squared),
          fileName: file.name,
          originalFile: file,
          crop: CENTERED_CROP,
        },
      ]);
    } catch (caught) {
      setUploadError(caught instanceof Error ? caught.message : `${file.name} failed to upload.`);
    } finally {
      setUploading((current) => current.filter((item) => item.id !== slot.id));
    }
  }

  /** Re-crops `editing`'s original file with a manually-chosen transform and re-uploads it, replacing that photo's key in place. */
  async function handleRecrop(crop: CropTransform) {
    const target = editing;
    // The crop button is only rendered for photos that have a file, so a
    // null here is unreachable through the UI - this is the type's guarantee,
    // not a user-facing state.
    if (!target?.originalFile) return;
    const original = target.originalFile;
    setEditing(null);
    setRecroppingKey(target.key);

    try {
      const bitmap = await createImageBitmap(original, { imageOrientation: "from-image" });
      const cropped = await cropBitmapToFile(bitmap, crop, original.type, original.name);
      bitmap.close();
      if (!cropped) throw new Error(`${target.fileName} could not be re-cropped. Try again.`);

      const photo_key = await putPhotoToS3(cropped);

      setPhotos((current) =>
        current.map((photo) => {
          if (photo.key !== target.key) return photo;
          releasePreview(photo.previewUrl);
          return { ...photo, key: photo_key, previewUrl: URL.createObjectURL(cropped), crop };
        }),
      );
    } catch (caught) {
      setUploadError(caught instanceof Error ? caught.message : `${target.fileName} failed to upload.`);
    } finally {
      setRecroppingKey(null);
    }
  }

  function removePhoto(key: string) {
    setPhotos((current) => {
      const target = current.find((photo) => photo.key === key);
      if (target) releasePreview(target.previewUrl);
      return current.filter((photo) => photo.key !== key);
    });
  }

  return (
    <fieldset className="border border-line bg-white p-5">
      <legend className="px-2 text-sm font-medium">
        Photos
        <RequiredMark />
      </legend>
      <p className="body-copy">
        At least one is required. Up to {MAX_LISTING_PHOTOS}, JPEG/PNG/WebP.
      </p>

      <input type="hidden" name="photo_keys" value={JSON.stringify(photos.map((p) => p.key))} />

      {(photos.length > 0 || uploading.length > 0) && (
        <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {photos.map((photo) =>
            photo.key === recroppingKey ? (
              <li
                key={photo.key}
                className="flex aspect-square items-center justify-center border border-dashed border-line bg-surface-muted text-xs text-ink-soft"
              >
                Saving…
              </li>
            ) : (
              <li key={photo.key} className="group relative aspect-square overflow-hidden border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element -- a local blob: URL or a short-lived presigned S3 URL; neither is an optimizable remote image */}
                <img src={photo.previewUrl} alt="" className="h-full w-full object-cover" />
                <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  {photo.originalFile && (
                    <button
                      type="button"
                      onClick={() => setEditing(photo)}
                      aria-label={`Edit crop for ${photo.fileName}`}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-ink/80 text-white"
                    >
                      <Crop className="size-3.5" aria-hidden="true" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.key)}
                    aria-label={`Remove ${photo.fileName}`}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-ink/80 text-xs text-white"
                  >
                    ×
                  </button>
                </div>
              </li>
            ),
          )}
          {uploading.map((slot) => (
            <li
              key={slot.id}
              className="flex aspect-square items-center justify-center border border-dashed border-line bg-surface-muted text-xs text-ink-soft"
            >
              Uploading…
            </li>
          ))}
        </ul>
      )}

      {editing?.originalFile && (
        <PhotoCropModal
          file={editing.originalFile}
          initialCrop={editing.crop}
          onCancel={() => setEditing(null)}
          onSave={(crop) => void handleRecrop(crop)}
        />
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
        <p role="alert" className="mt-3 text-xs text-accent-dark">
          {uploadError}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-xs text-accent-dark">
          {error}
        </p>
      )}
    </fieldset>
  );
}
