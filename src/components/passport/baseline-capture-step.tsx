"use client";

import { useState, useTransition } from "react";
import { Button, FormError, RequiredMark } from "@/components/ui";
import { putPhotoToS3 } from "@/components/listings/photo-upload-field";
import { saveBaselineAndPublish } from "@/app/listings/[id]/passport/baseline/actions";
import { ALLOWED_PHOTO_CONTENT_TYPES, BASELINE_ANGLES, type BaselineAngle } from "@/lib/listings";

type Slot = { key: string; previewUrl: string } | "uploading";

/**
 * Guided four-angle capture for the Product Passport baseline (S2-04).
 *
 * Each slot uploads the moment a photo is picked, like PhotoUploadField, but
 * under the passport prefix and without the square crop: this is evidence of
 * the item's condition, so the owner's framing is kept as taken.
 */
export function BaselineCaptureStep({ listingId, publishes }: { listingId: string; publishes: boolean }) {
  const [slots, setSlots] = useState<Partial<Record<BaselineAngle, Slot>>>({});
  const [error, setError] = useState<string>();
  const [saving, startSaving] = useTransition();

  async function upload(angle: BaselineAngle, file: File | undefined) {
    if (!file) return;
    if (!ALLOWED_PHOTO_CONTENT_TYPES.includes(file.type as (typeof ALLOWED_PHOTO_CONTENT_TYPES)[number])) {
      setError(`${file.name}: unsupported file type. Use JPEG, PNG or WebP.`);
      return;
    }
    setError(undefined);
    setSlots((current) => ({ ...current, [angle]: "uploading" }));
    try {
      const key = await putPhotoToS3(file, "passport");
      setSlots((current) => ({ ...current, [angle]: { key, previewUrl: URL.createObjectURL(file) } }));
    } catch (caught) {
      setSlots((current) => ({ ...current, [angle]: undefined }));
      setError(caught instanceof Error ? caught.message : `${file.name} failed to upload.`);
    }
  }

  const keys = Object.fromEntries(
    BASELINE_ANGLES.flatMap(({ key }) => {
      const slot = slots[key];
      return slot && slot !== "uploading" ? [[key, slot.key]] : [];
    }),
  ) as Record<BaselineAngle, string>;
  const complete = Object.keys(keys).length === BASELINE_ANGLES.length;

  function submit() {
    startSaving(async () => {
      const result = await saveBaselineAndPublish(listingId, keys);
      setError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <ul className="grid grid-cols-2 gap-4">
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
                  disabled={slot === "uploading" || saving}
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

      <FormError message={error} />

      <Button type="button" disabled={!complete || saving} onClick={submit}>
        {saving ? "Saving…" : publishes ? "Save baseline and publish" : "Save baseline"}
      </Button>
    </div>
  );
}
