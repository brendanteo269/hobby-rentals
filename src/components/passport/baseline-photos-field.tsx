"use client";

import { useActionState, useState } from "react";
import { Button, FormError, RequiredMark } from "@/components/ui";
import { putPhotoToS3 } from "@/components/listings/photo-upload-field";
import { saveBaselineAndPublish } from "@/app/listings/[id]/passport/baseline/actions";
import { ALLOWED_PHOTO_CONTENT_TYPES, BASELINE_ANGLES, type BaselineAngle } from "@/lib/listings";

type Slot = { key: string; previewUrl: string } | "uploading";

/**
 * Guided four-angle capture for the Product Passport baseline (S2-04).
 *
 * Each slot uploads the moment a photo is picked, like PhotoUploadField, but
 * without the square crop: this is evidence of the item's condition, so the
 * owner's framing is kept as taken. The keys are submitted twice: as
 * `baseline_photos` (see parseBaselinePhotos) for the passport, and as
 * `photo_keys` so the create form uses the same four as the listing's photos.
 * They go under the public listings/ prefix for that reason.
 */
export function BaselinePhotosField({ error }: { error?: string }) {
  const [slots, setSlots] = useState<Partial<Record<BaselineAngle, Slot>>>({});
  const [uploadError, setUploadError] = useState<string>();

  async function upload(angle: BaselineAngle, file: File | undefined) {
    if (!file) return;
    if (!ALLOWED_PHOTO_CONTENT_TYPES.includes(file.type as (typeof ALLOWED_PHOTO_CONTENT_TYPES)[number])) {
      setUploadError(`${file.name}: unsupported file type. Use JPEG, PNG or WebP.`);
      return;
    }
    setUploadError(undefined);
    setSlots((current) => ({ ...current, [angle]: "uploading" }));
    try {
      const key = await putPhotoToS3(file);
      setSlots((current) => ({ ...current, [angle]: { key, previewUrl: URL.createObjectURL(file) } }));
    } catch (caught) {
      setSlots((current) => ({ ...current, [angle]: undefined }));
      setUploadError(caught instanceof Error ? caught.message : `${file.name} failed to upload.`);
    }
  }

  const keys = Object.fromEntries(
    BASELINE_ANGLES.flatMap(({ key }) => {
      const slot = slots[key];
      return slot && slot !== "uploading" ? [[key, slot.key]] : [];
    }),
  );

  return (
    <div className="space-y-4">
      <p className="body-copy">
        Photograph the item from all four angles. These are shown on your listing and start its
        Product Passport, a permanent condition record that can&apos;t be edited or deleted.
      </p>
      <input type="hidden" name="baseline_photos" value={JSON.stringify(keys)} />
      <input type="hidden" name="photo_keys" value={JSON.stringify(Object.values(keys))} />
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {BASELINE_ANGLES.map(({ key, label }) => {
          const slot = slots[key];
          return (
            <li key={key}>
              <label className="block cursor-pointer">
                <span className="text-sm font-medium">
                  {label}
                  <RequiredMark />
                </span>
                <span className="mt-2 flex aspect-square items-center justify-center overflow-hidden border border-dashed border-line bg-surface-muted text-xs text-ink-soft">
                  {slot === "uploading" ? (
                    "Uploading…"
                  ) : slot ? (
                    // eslint-disable-next-line @next/next/no-img-element -- a local blob: preview
                    <img src={slot.previewUrl} alt={`${label} baseline photo`} className="h-full w-full object-cover" />
                  ) : (
                    "Add photo"
                  )}
                </span>
                <input
                  type="file"
                  accept={ALLOWED_PHOTO_CONTENT_TYPES.join(",")}
                  capture="environment"
                  className="sr-only"
                  disabled={slot === "uploading"}
                  onChange={(event) => {
                    void upload(key, event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
            </li>
          );
        })}
      </ul>
      <FormError message={uploadError ?? error} />
    </div>
  );
}

/** The baseline on its own, for a draft finishing its passport or a listing that predates passports. */
export function BaselineForm({ listingId, publishes }: { listingId: string; publishes: boolean }) {
  const [state, formAction, pending] = useActionState(saveBaselineAndPublish.bind(null, listingId), undefined);

  return (
    <form action={formAction} className="space-y-6">
      <BaselinePhotosField error={state?.error} />
      <Button disabled={pending}>
        {pending ? "Saving…" : publishes ? "Save baseline and publish" : "Save baseline"}
      </Button>
    </form>
  );
}
