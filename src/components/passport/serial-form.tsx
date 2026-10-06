"use client";

import { useActionState, useState } from "react";
import { Button, Field, FormError, FormNotice } from "@/components/ui";
import { putPhotoToS3 } from "@/components/listings/photo-upload-field";
import { readSerial } from "@/app/listings/actions";
import { saveSerial } from "@/app/listings/[id]/passport/serial/actions";
import { ALLOWED_PHOTO_CONTENT_TYPES, type SerialExtraction } from "@/lib/listings";

type Photo = { key: string; previewUrl: string; reading: SerialExtraction | "reading" };

/**
 * S2-05: photo of the serial label -> suggested serial -> owner confirms or
 * corrects it. Read by parseSerialClaim. The photo goes under the private
 * passports/ prefix. Whatever the model makes of it, the owner can always
 * type the serial themselves.
 *
 * The serial input is controlled: a form action resets uncontrolled inputs
 * after submit, which would quietly swap an owner's correction back to the
 * suggestion whenever some other field failed validation.
 */
export function SerialField({ error }: { error?: string }) {
  const [photo, setPhoto] = useState<Photo | "uploading">();
  const [serial, setSerial] = useState("");
  const [photoError, setPhotoError] = useState<string>();
  // S2-32: no serial on the item, so the photo is of its distinguishing marks and nothing is read off it.
  const [noSerial, setNoSerial] = useState(false);

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!ALLOWED_PHOTO_CONTENT_TYPES.includes(file.type as (typeof ALLOWED_PHOTO_CONTENT_TYPES)[number])) {
      setPhotoError(`${file.name}: unsupported file type. Use JPEG, PNG or WebP.`);
      return;
    }
    setPhotoError(undefined);
    setPhoto("uploading");
    let key: string;
    try {
      key = await putPhotoToS3(file, "passport");
    } catch (caught) {
      setPhoto(undefined);
      setPhotoError(caught instanceof Error ? caught.message : `${file.name} failed to upload.`);
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    if (noSerial) {
      setPhoto({ key, previewUrl, reading: { serial: null, confidence: 0, readable: false } });
      return;
    }
    setPhoto({ key, previewUrl, reading: "reading" });
    const reading = await readSerial(key);
    setPhoto({ key, previewUrl, reading });
    setSerial(reading.serial ?? "");
  }

  const ready = photo && photo !== "uploading" ? photo : undefined;
  const reading = ready && ready.reading !== "reading" ? ready.reading : undefined;

  return (
    <div className="space-y-4">
      <p className="body-copy">
        {noSerial
          ? "Photograph something that sets this item apart: scratches, stickers, engraving or wear. It becomes the item's permanent identity."
          : "Photograph the label with the item's serial number. It becomes the item's permanent identity and is never shown to renters."}
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={noSerial}
          disabled={photo === "uploading" || (photo !== undefined && photo.reading === "reading")}
          onChange={(event) => {
            // The photo means something different either way, so switching starts it over.
            setNoSerial(event.target.checked);
            setPhoto(undefined);
            setSerial("");
          }}
        />
        This item has no serial number
      </label>
      {noSerial && <input type="hidden" name="no_serial" value="true" />}
      <label className="block cursor-pointer">
        <span className="text-sm font-medium">{noSerial ? "Distinguishing marks" : "Serial number label"}</span>
        <span className="mt-2 flex aspect-[4/3] max-w-sm items-center justify-center overflow-hidden border border-dashed border-line bg-surface-muted text-xs text-ink-soft">
          {photo === "uploading" ? (
            "Uploading…"
          ) : ready ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local blob: preview
            <img src={ready.previewUrl} alt={noSerial ? "Distinguishing marks" : "Serial number label"} className="h-full w-full object-contain" />
          ) : (
            "Take or choose a photo"
          )}
        </span>
        <input
          type="file"
          accept={ALLOWED_PHOTO_CONTENT_TYPES.join(",")}
          capture="environment"
          className="sr-only"
          disabled={photo === "uploading" || ready?.reading === "reading"}
          onChange={(event) => {
            void upload(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </label>
      <FormError message={photoError} />

      {ready?.reading === "reading" && <p className="body-copy">Reading the serial number…</p>}

      {ready && noSerial && <input type="hidden" name="serial_photo_key" value={ready.key} />}

      {ready && reading && !noSerial && (
        <>
          {reading.readable ? (
            <FormNotice tone="success" message="Check this matches the label exactly and fix anything that's wrong." />
          ) : (
            <FormNotice message="We couldn't read the serial number clearly. Retake the photo, or type it in below." />
          )}
          {/* S2-05 Scenario 1: the owner sees how sure the reading is before confirming it. */}
          {reading.serial && (
            <p className="text-xs text-ink-soft">Read with {Math.round(reading.confidence * 100)}% confidence.</p>
          )}
          <input type="hidden" name="serial_photo_key" value={ready.key} />
          <input type="hidden" name="serial_extracted" value={reading.serial ?? ""} />
          <input type="hidden" name="serial_confidence" value={reading.serial ? String(reading.confidence) : ""} />
          <Field
            label="Serial number"
            id="serial"
            name="serial"
            maxLength={64}
            required
            autoComplete="off"
            value={serial}
            onChange={(event) => setSerial(event.target.value)}
          />
        </>
      )}
      <FormError message={error} />
    </div>
  );
}

/** For a listing created before serials were required: the field on its own page. */
export function SerialForm({ listingId }: { listingId: string }) {
  const [state, formAction, pending] = useActionState(saveSerial.bind(null, listingId), undefined);

  return (
    <form action={formAction} className="space-y-6">
      <SerialField error={state?.error} />
      <Button disabled={pending}>{pending ? "Saving…" : "Save identity"}</Button>
    </form>
  );
}
