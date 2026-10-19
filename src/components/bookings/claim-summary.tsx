import { RequestCountdown } from "@/components/bookings/request-countdown";
import { claimPendingRenter, secondsUntil, type DamageClaim } from "@/lib/settlement";
import { formatDateTime, formatMoney } from "@/lib/format";

/**
 * S3-06: a submitted claim as either party reads it - what the owner says is
 * damaged, what they claim, the deposit it holds, their evidence photos, and
 * where it stands.
 */
export function ClaimSummary({ claim, viewer }: { claim: DamageClaim; viewer: "owner" | "renter" }) {
  const pending = claimPendingRenter(claim);
  const secondsLeft = claim.respond_by ? secondsUntil(claim.respond_by) : null;
  return (
    <section aria-labelledby="claim-summary-heading" className="space-y-4 border border-line px-4 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="claim-summary-heading" className="heading text-xl">
          {viewer === "owner" ? "Your damage claim" : `${claim.owner_name ?? "The owner"}'s damage claim`}
        </h2>
        <p className="text-sm font-medium">
          {pending ? (
            <>
              Claim pending renter · <RequestCountdown expiresInSeconds={secondsLeft} />
            </>
          ) : claim.status === "RESOLVED" ? (
            "Decided"
          ) : (
            "With the platform"
          )}
        </p>
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-ink-soft">Claimed</dt>
          <dd className="text-lg font-semibold">{formatMoney(claim.claimed_cents)}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Deposit held</dt>
          <dd className="text-lg font-semibold">{claim.deposit_cents != null ? formatMoney(claim.deposit_cents) : "—"}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">{pending ? "Respond by" : "Submitted"}</dt>
          <dd>{formatDateTime(pending && claim.respond_by ? claim.respond_by : claim.created_at)}</dd>
        </div>
      </dl>
      <div>
        <p className="text-sm text-ink-soft">What is damaged</p>
        <p className="body-copy mt-1 whitespace-pre-line">{claim.description}</p>
      </div>
      {claim.evidence_photo_urls.length > 0 && (
        <div>
          <p className="text-sm text-ink-soft">{viewer === "owner" ? "Your" : "The owner's"} evidence photos</p>
          <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {claim.evidence_photo_urls.map((url, index) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a short-lived presigned URL */}
                  <img src={url} alt={`Evidence photo ${index + 1}`} className="aspect-square w-full border border-line object-cover" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-sm text-ink-soft">
        {pending
          ? viewer === "owner"
            ? "The renter can accept or dispute your claim. The deposit and your payout stay on hold until then."
            : "Nothing is deducted until you accept, the time to respond runs out, or a dispute is decided."
          : "The deposit and payout stay on hold until the claim is settled."}
      </p>
    </section>
  );
}
