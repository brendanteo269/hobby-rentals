"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, FormNotice, TextareaField } from "@/components/ui";
import { putPhotoToS3 } from "@/components/listings/photo-upload-field";
import { RequestCountdown } from "@/components/bookings/request-countdown";
import { RepairEstimateBreakdown } from "@/components/bookings/repair-estimate";
import { loadRepairEstimate, submitClaim } from "@/app/bookings/actions";
import type { ConditionScan } from "@/lib/condition-scans";
import type { RepairEstimate } from "@/lib/settlement";
import { ALLOWED_PHOTO_CONTENT_TYPES } from "@/lib/listings";
import { centsToDollars, dollarsToCents, formatDateTime, formatMoney } from "@/lib/format";

/** The most evidence photos a claim takes; the API and the database cap it too. */
const MAX_EVIDENCE = 6;
/** S4-08: the most quote or receipt photos; the API and the database cap it too. */
const MAX_QUOTES = 3;

type Evidence = { key: string; previewUrl: string };

/** S4-08: the AI estimate's state - worked out after the form renders, as the first one searches the web. */
type EstimateState = { status: "loading" } | { status: "ready"; estimate: RepairEstimate } | { status: "failed"; message: string } | null;

/**
 * S3-06 Scenario 2: the owner's damage claim - the reason, the repair cost,
 * and their own evidence photos - next to the AI report it rests on, when the
 * AI checked the return. The
 * claim window's countdown sits by the button; the page stops offering the
 * form once the window closes.
 *
 * S4-08: when the AI found damage, the owner can ask for its repair-cost
 * estimate - only on request, as it searches the web for up to a minute. It
 * pre-fills the repair cost and shows the breakdown above it. The owner can change the amount;
 * well above the estimate they must attach a repair quote or receipt.
 */
export function ClaimForm({
  bookingId,
  windowEndsAt,
  windowSecondsLeft,
  depositCents,
  scan,
}: {
  bookingId: string;
  windowEndsAt: string;
  /** Worked out on the server, so a browser with a wrong clock still counts down to the real deadline. */
  windowSecondsLeft: number;
  depositCents: number | null;
  /** The AI's check of the return, whose report goes with the claim; null when there was none. */
  scan: ConditionScan | null;
}) {
  const hasScan = scan !== null;
  const damageFound = scan?.status === "COMPLETED" && scan.verdict === "DAMAGE_DETECTED";
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [quotes, setQuotes] = useState<Evidence[]>([]);
  const [estimate, setEstimate] = useState<EstimateState>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  async function getEstimate() {
    setEstimate({ status: "loading" });
    const result = await loadRepairEstimate(bookingId);
    if ("error" in result) return setEstimate({ status: "failed", message: result.error });
    setEstimate({ status: "ready", estimate: result.estimate });
    // Scenario 1: pre-filled, unless the owner has already typed a figure.
    setAmount((typed) => typed || centsToDollars(result.estimate.total_cents));
  }

  const ready = estimate?.status === "ready" ? estimate.estimate : null;
  const claimedCents = dollarsToCents(amount);
  // Scenario 7: well above the estimate, the claim needs a quote or receipt.
  const quoteNeeded = Boolean(ready && claimedCents !== null && claimedCents > ready.quote_required_above_cents);

  async function addPhotos(files: FileList | null, kind: "evidence" | "quote" = "evidence") {
    if (!files?.length) return;
    setError(undefined);
    setUploading(true);
    const [held, max, setList] = kind === "quote" ? [quotes, MAX_QUOTES, setQuotes] : [evidence, MAX_EVIDENCE, setEvidence];
    try {
      const room = max - held.length;
      const added: Evidence[] = [];
      for (const file of Array.from(files).slice(0, room)) {
        added.push({ key: await putPhotoToS3(file, "claim"), previewUrl: URL.createObjectURL(file) });
      }
      setList((current) => [...current, ...added]);
      if (files.length > room) setError(`Attach at most ${max} ${kind === "quote" ? "quote" : "evidence"} photos.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "A photo failed to upload. Try again.");
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    if (!description.trim()) return setError("Say what is damaged.");
    if (claimedCents === null || !Number.isFinite(claimedCents) || claimedCents <= 0) {
      return setError("Enter what the damage would cost to put right.");
    }
    if (quoteNeeded && quotes.length === 0) return setError("Attach a repair quote or receipt for a claim this far above the estimate.");
    setError(undefined);
    startTransition(async () => {
      const result = await submitClaim(
        bookingId,
        description.trim(),
        claimedCents,
        evidence.map((photo) => photo.key),
        quoteNeeded ? quotes.map((photo) => photo.key) : [],
      );
      if ("error" in result) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <section aria-labelledby="claim-heading" className="space-y-4 rounded-xl border border-line px-4 py-4">
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
        {hasScan && "Check the item against the AI report first. "}Claiming keeps the renter&apos;s deposit
        {depositCents ? ` (${formatMoney(depositCents)})` : ""} and your payout on hold while the renter reviews
        it; they can accept or dispute it.{hasScan && " The AI report is attached to your claim."}
      </p>
      {damageFound && (estimate === null || estimate.status === "failed") && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line px-4 py-3">
          <Button type="button" variant="outline" onClick={() => void getEstimate()}>
            {estimate?.status === "failed" ? "Try the AI estimate again" : "Get AI estimate"}
          </Button>
          <p className="text-sm text-ink-soft">
            Searches repair prices and second-hand listings on the web to suggest a repair cost. Takes up to a minute.
          </p>
        </div>
      )}
      {estimate?.status === "loading" && (
        <p role="status" className="rounded-xl border border-line px-4 py-3 text-sm">
          Searching repair prices and second-hand listings on the web for an AI estimate… This can take up to a minute.
        </p>
      )}
      {estimate?.status === "failed" && <FormNotice message={estimate.message} />}
      {ready && (
        <RepairEstimateBreakdown
          estimate={ready}
          scan={scan}
          onUseMarketValue={(cents) => setAmount(centsToDollars(cents))}
        />
      )}
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
        hint={
          ready
            ? `Pre-filled with the AI estimate (likely ${formatMoney(ready.low_cents)} to ${formatMoney(ready.high_cents)}). Change it if your own figure differs. The renter sees both.`
            : "What it would cost to put right. The renter sees this figure."
        }
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
                <img src={photo.previewUrl} alt="Evidence photo" className="aspect-square w-full rounded-xl border border-line object-cover" />
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
      {quoteNeeded && ready && (
        <div className="space-y-2 rounded-lg border-l-2 border-accent bg-accent-soft px-3 py-2">
          <p className="text-sm">
            <span className="font-medium">Attach a repair quote or receipt.</span> Your figure is more than 25% above the top of
            the AI&apos;s range ({formatMoney(ready.high_cents)}), so it needs proof.
          </p>
          {quotes.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {quotes.map((photo) => (
                <li key={photo.key} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a local blob: preview */}
                  <img src={photo.previewUrl} alt="Repair quote" className="h-16 w-16 rounded-lg border border-line object-cover" />
                  <button
                    type="button"
                    className="absolute right-0.5 top-0.5 rounded-full bg-white/90 px-1 text-xs"
                    aria-label="Remove this quote"
                    onClick={() => setQuotes((current) => current.filter((item) => item.key !== photo.key))}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
          {quotes.length < MAX_QUOTES && (
            <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-surface-muted focus-within:ring-2 focus-within:ring-accent/40">
              {uploading ? "Uploading…" : "Add quote or receipt"}
              <input
                type="file"
                multiple
                accept={ALLOWED_PHOTO_CONTENT_TYPES.join(",")}
                className="sr-only"
                disabled={uploading}
                onChange={(event) => {
                  void addPhotos(event.target.files, "quote");
                  event.target.value = "";
                }}
              />
            </label>
          )}
        </div>
      )}
      <FormNotice message={error} />
      <Button onClick={submit} disabled={isPending || uploading}>
        {isPending ? "Submitting…" : "Submit damage claim"}
      </Button>
    </section>
  );
}
