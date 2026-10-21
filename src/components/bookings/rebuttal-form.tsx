"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button, FormNotice, Notice } from "@/components/ui";
import { disputeClaim } from "@/app/bookings/[id]/claim/actions";
import { putPhotoToS3 } from "@/components/listings/photo-upload-field";
import { ALLOWED_PHOTO_CONTENT_TYPES } from "@/lib/listings";

const MAX_PHOTOS = 6;

type Evidence = { key: string; previewUrl: string };

/**
 * S3-08 Scenario 1: the renter's rebuttal.
 *
 * The written explanation is required and the photos are not, which is the
 * whole shape of the form: an arbitrator can decide on words alone, never on
 * pictures alone. The button stays disabled until there is something to read,
 * so the server's refusal is a backstop rather than the first thing the
 * renter meets.
 *
 * Submitting is final - it freezes the evidence bundle and hands the case to
 * an arbitrator - so the consequences are stated above the button rather than
 * discovered afterwards.
 */
export function RebuttalForm({ bookingId, onCancel }: { bookingId: string; onCancel: () => void }) {
  const router = useRouter();
  const [rebuttal, setRebuttal] = useState("");
  const [photos, setPhotos] = useState<Evidence[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError(undefined);
    setUploading(true);
    try {
      const room = MAX_PHOTOS - photos.length;
      const added: Evidence[] = [];
      for (const file of Array.from(files).slice(0, room)) {
        added.push({ key: await putPhotoToS3(file, "rebuttal"), previewUrl: URL.createObjectURL(file) });
      }
      setPhotos((current) => [...current, ...added]);
      if (files.length > room) setError(`A rebuttal takes at most ${MAX_PHOTOS} photos.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "A photo failed to upload. Try again.");
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    setError(undefined);
    startTransition(async () => {
      const result = await disputeClaim(bookingId, rebuttal.trim(), photos.map((photo) => photo.key));
      if ("error" in result) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="rebuttal" className="block text-sm font-medium text-ink">
          Why or what do you disagree with? <span className="text-ink-soft">(required)</span>
        </label>
        <textarea
          id="rebuttal"
          rows={5}
          value={rebuttal}
          maxLength={2000}
          disabled={isPending}
          onChange={(event) => setRebuttal(event.target.value)}
          placeholder="Explain your reasons."
          className="mt-2 w-full border border-line px-3 py-2 text-sm"
        />
      </div>

      <div>
        <p className="text-sm font-medium text-ink">
          Counter-evidence photos<span className="text-ink-soft">(optional, up to {MAX_PHOTOS})</span>
        </p>
        {photos.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {photos.map((photo) => (
              <li key={photo.key} className="relative">
                <Image src={photo.previewUrl} alt="" width={72} height={72} unoptimized className="h-18 w-18 border border-line object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos((current) => current.filter((p) => p.key !== photo.key))}
                  className="absolute right-0 top-0 bg-ink px-1 text-xs text-white"
                  aria-label="Remove photo"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        {photos.length < MAX_PHOTOS && (
          /* The same styled label the owner's claim form uses, so both sides
             of a dispute attach photos through the same control. */
          <label className="mt-2 inline-flex cursor-pointer items-center justify-center rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-surface-muted focus-within:ring-2 focus-within:ring-accent/40">
            {uploading ? "Uploading…" : "Add photos"}
            <input
              type="file"
              multiple
              accept={ALLOWED_PHOTO_CONTENT_TYPES.join(",")}
              className="sr-only"
              disabled={uploading || isPending}
              onChange={(event) => {
                void addPhotos(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
        )}
      </div>

      <Notice>
        By submitting a dispute, this will hand the case over to the platform administrator to decide. Your security deposit will stay on hold until the case is resolved.
      </Notice>

      <FormNotice message={error} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" disabled={isPending} onClick={onCancel}>
          Go back
        </Button>
        <Button disabled={isPending || uploading || rebuttal.trim().length === 0} onClick={submit}>
          {isPending ? "Submitting…" : "Submit dispute"}
        </Button>
      </div>
    </div>
  );
}
