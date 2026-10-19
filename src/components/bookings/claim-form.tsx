"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, FormNotice, TextareaField } from "@/components/ui";
import { putPhotoToS3 } from "@/components/listings/photo-upload-field";
import { RequestCountdown } from "@/components/bookings/request-countdown";
import { submitClaim } from "@/app/bookings/actions";
import { ALLOWED_PHOTO_CONTENT_TYPES } from "@/lib/listings";
import { dollarsToCents, formatDateTime, formatMoney } from "@/lib/format";

/** The most evidence photos a claim takes; the API and the database cap it too. */
const MAX_EVIDENCE = 6;

type Evidence = { key: string; previewUrl: string };

/**
 * S3-06 Scenario 2: the owner's damage claim - the reason, the repair cost,
 * and their own evidence photos - next to the AI report it rests on. The
 * claim window's countdown sits by the button; the page stops offering the
 * form once the window closes.
 */
export function ClaimForm({
  bookingId,
  windowEndsAt,
  windowSecondsLeft,
  depositCents,
}: {
  bookingId: string;
  windowEndsAt: string;
  /** Worked out on the server, so a browser with a wrong clock still counts down to the real deadline. */
  windowSecondsLeft: number;
  depositCents: number | null;
}) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError(undefined);
    setUploading(true);
    try {
      const room = MAX_EVIDENCE - evidence.length;
      const added: Evidence[] = [];
      for (const file of Array.from(files).slice(0, room)) {
        added.push({ key: await putPhotoToS3(file, "claim"), previewUrl: URL.createObjectURL(file) });
      }
      setEvidence((current) => [...current, ...added]);
      if (files.length > room) setError(`A claim takes at most ${MAX_EVIDENCE} photos.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "A photo failed to upload. Try again.");
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    const claimedCents = dollarsToCents(amount);
    if (!description.trim()) return setError("Say what is damaged.");
    if (claimedCents === null || !Number.isFinite(claimedCents) || claimedCents <= 0) {
      return setError("Enter what the damage would cost to put right.");
    }
    setError(undefined);
    startTransition(async () => {
      const result = await submitClaim(bookingId, description.trim(), claimedCents, evidence.map((photo) => photo.key));
      if ("error" in result) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <section aria-labelledby="claim-heading" className="space-y-4 border border-line px-4 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="claim-heading" className="heading text-xl">
          Make a damage claim
        </h2>
        <p className="text-sm">
          Claim window: <RequestCountdown expiresInSeconds={windowSecondsLeft} />
          <span className="text-ink-soft"> · {formatDateTime(windowEndsAt)}</span>
        </p>
      </div>
      <p className="text-sm text-ink-soft">
        Check the item against the AI report first. Claiming keeps the renter&apos;s deposit
        {depositCents ? ` (${formatMoney(depositCents)})` : ""} and your payout on hold while the renter reviews
        it; they can accept or dispute it. The AI report is attached to your claim.
      </p>
      <TextareaField
        id="claim-reason"
        label="What is damaged, and how"
        rows={4}
        maxLength={2000}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        required
      />
      <Field
        id="claim-amount"
        label="Repair or replacement cost (S$)"
        hint="What it would cost to put right. The renter sees this figure."
        type="number"
        inputMode="decimal"
        min="0.01"
        step="0.01"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        required
      />
      <div className="space-y-2">
        <p className="text-sm font-medium">
          Your evidence photos <span className="font-normal text-ink-soft">(optional, up to {MAX_EVIDENCE})</span>
        </p>
        {evidence.length > 0 && (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {evidence.map((photo) => (
              <li key={photo.key} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- a local blob: preview */}
                <img src={photo.previewUrl} alt="Evidence photo" className="aspect-square w-full border border-line object-cover" />
                <button
                  type="button"
                  className="absolute right-1 top-1 rounded-full bg-white/90 px-1.5 text-xs"
                  aria-label="Remove this photo"
                  onClick={() => setEvidence((current) => current.filter((item) => item.key !== photo.key))}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        {evidence.length < MAX_EVIDENCE && (
          <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-surface-muted focus-within:ring-2 focus-within:ring-accent/40">
            {uploading ? "Uploading…" : "Add photos"}
            <input
              type="file"
              multiple
              accept={ALLOWED_PHOTO_CONTENT_TYPES.join(",")}
              className="sr-only"
              disabled={uploading}
              onChange={(event) => {
                void addPhotos(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
        )}
      </div>
      <FormNotice message={error} />
      <Button onClick={submit} disabled={isPending || uploading}>
        {isPending ? "Submitting…" : "Submit damage claim"}
      </Button>
    </section>
  );
}
