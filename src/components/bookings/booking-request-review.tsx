import Link from "next/link";
import { Badge, EmptyState } from "@/components/ui";
import { BookingRequestDecision } from "@/components/bookings/booking-request-decision";
import { DeliveryAddressLine } from "@/components/bookings/delivery-address-line";
import { TrustedRenterBadge } from "@/components/bookings/trusted-renter-badge";
import { BookingRiskPanel } from "@/components/bookings/booking-risk-panel";
import { HigherDepositOffer } from "@/components/bookings/higher-deposit-offer";
import { RequestCountdown } from "@/components/bookings/request-countdown";
import { BOOKING_STATUS_LABELS, type BookingRequestDetail } from "@/lib/bookings";
import { adjustmentLines } from "@/lib/bundle-items";
import { cancellationOutcomeLine } from "@/lib/cancellations";
import { formatDate, formatMoney, formatMonthYear } from "@/lib/format";

function money(cents: number | null) {
  return cents === null ? "—" : formatMoney(cents);
}

/** How a cancelled request ended, in words for its owner; a renter's suspension adds that the dates are free again. */
function cancelledBody(outcome: NonNullable<BookingRequestDetail["cancellation_outcome"]>): string {
  const line = cancellationOutcomeLine(outcome, "owner");
  return outcome.cancelled_reason?.startsWith("user_unavailable_renter") ? `${line} Those dates are open for booking again.` : line;
}

/**
 * One request, single or bundle, with everything the owner decides it on:
 * who is asking, for when, and what it is worth to them.
 */
export function BookingRequestReview({ request }: { request: BookingRequestDetail }) {
  const { renter, period, pricing } = request;
  const days = period.rental_days ?? 0;
  const bundle = request.kind === "BUNDLE";
  const href = bundle ? `/bundles/${request.bundle_id}` as const : `/listings/${request.listing_id}` as const;

  return (
    <>
      <Link href="/listings/mine/bookings" className="eyebrow hover:text-ink">← All bookings</Link>

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          {bundle && <p className="eyebrow">Bundle request</p>}
          <h2 className="heading text-2xl">
            <Link href={href} className="hover:underline">{request.name ?? (bundle ? "Bundle" : "Listing")}</Link>
          </h2>
        </div>
        <p className="text-sm text-ink-soft">
          {request.status === "PENDING"
            ? <RequestCountdown expiresInSeconds={request.expires_in_seconds} />
            : BOOKING_STATUS_LABELS[request.status]}
        </p>
      </div>
      {request.kit_id && (
        // S5-09: only this owner's part of the renter's bundle is shown, and answering
        // covers all of it; what the renter asked other owners for is not theirs to see.
        <p className="mt-2 text-sm text-ink-soft">
          Part of a bundle the renter is requesting from several owners. This request covers your{" "}
          {request.items.length === 1 ? "item" : `${request.items.length} items`}:{" "}
          {request.items.map((item) => item.listing_name ?? "an item").join(", ")}. You answer for all of them together, and if you
          decline, the renter&apos;s other requests in the bundle are cancelled.
        </p>
      )}
      {bundle && (
        // A bundle is decided whole, so the owner should see everything the
        // decision covers before making it.
        <p className="mt-2 text-sm text-ink-soft">
          Covers all {request.items.length} items: {request.items.map((item) => item.listing_name ?? "an item").join(", ")}
          {adjustmentLines(request.adjustments).map((line) => (
            // S5-10: what the renter left out, and the backups that stand in for items.
            <span key={line} className="block">{line}</span>
          ))}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5" aria-labelledby="renter-heading">
          <p id="renter-heading" className="eyebrow">Renter</p>
          <p className="mt-2 text-lg font-semibold">{renter.display_name ?? "Unnamed member"}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {/* S4-06 Scenario 3. First of the two: it is the one about how
                this person has treated other people's gear, which is what the
                owner is deciding on. */}
            <TrustedRenterBadge trusted={renter.trusted} />
            <Badge variant={renter.email_verified ? "success" : "neutral"}>
              {renter.email_verified ? "Email verified" : "Email not verified"}
            </Badge>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-ink-soft">Rating</dt>
            <dd>{renter.rating === null ? "No ratings yet" : `${renter.rating.toFixed(1)} / 5 · ${renter.review_count} ${renter.review_count === 1 ? "review" : "reviews"}`}</dd>
            <dt className="text-ink-soft">Completed rentals</dt>
            <dd>{renter.completed_rentals}</dd>
            {renter.member_since && <>
              <dt className="text-ink-soft">Member since</dt>
              <dd>{formatMonthYear(renter.member_since)}</dd>
            </>}
          </dl>
          {renter.bio && <p className="body-copy mt-4">{renter.bio}</p>}
        </section>

        <section className="card p-5" aria-labelledby="earnings-heading">
          <p id="earnings-heading" className="eyebrow">Rental and earnings</p>
          <DeliveryAddressLine booking={pricing} className="mt-2 text-sm" />
          <p className="mt-2 text-sm">
            {formatDate(period.start_date)} – {formatDate(period.end_date)}
            {days > 0 && <span className="text-ink-soft"> · {days} {days === 1 ? "day" : "days"}</span>}
          </p>
          <dl className="mt-4 grid grid-cols-[1fr_auto] gap-y-2 text-sm">
            {pricing.price_per_day_cents !== null && <>
              <dt className="text-ink-soft">Daily rate</dt><dd className="text-right">{formatMoney(pricing.price_per_day_cents)}</dd>
            </>}
            {pricing.price_per_week_cents !== null && <>
              <dt className="text-ink-soft">Weekly rate</dt><dd className="text-right">{formatMoney(pricing.price_per_week_cents)}</dd>
            </>}
            {/* S5-12. With a code, the subtotal above is already net of it,
                so showing it alone leaves an owner unable to reconcile the
                rate times the days. Full price, then what their own code
                took off. */}
            <dt className="text-ink-soft">Rental subtotal</dt>
            <dd className="text-right">
              {money(
                pricing.promo_discount_cents
                  ? (pricing.rental_subtotal_cents ?? 0) + pricing.promo_discount_cents
                  : pricing.rental_subtotal_cents,
              )}
            </dd>
            {pricing.promo_discount_cents > 0 && <>
              <dt className="text-ink-soft">
                Your promo code{pricing.promo_code ? ` · ${pricing.promo_code.toUpperCase()}` : ""}
              </dt>
              <dd className="text-right">−{formatMoney(pricing.promo_discount_cents)}</dd>
            </>}
            <dt className="text-ink-soft">Platform fee (paid by renter)</dt><dd className="text-right">{money(pricing.platform_fee_cents)}</dd>
            {/* S6-09: the renter chose delivery. The fee is the owner's in full, paid when the renter
                confirms the handover, so it is shown apart from the rental and its commission. */}
            {pricing.delivery_selected && <>
              <dt className="text-ink-soft">Delivery fee (paid to you at handover)</dt>
              <dd className="text-right">{formatMoney(pricing.delivery_fee_cents ?? 0)}</dd>
            </>}
            <dt className="text-ink-soft">Security deposit (refundable)</dt><dd className="text-right">{money(pricing.deposit_cents)}</dd>
            <dt className="text-ink-soft">Damage protection</dt>
            <dd className="text-right">{pricing.damage_protection.selected ? formatMoney(pricing.damage_protection.fee_cents) : "Not selected"}</dd>
            <dt className="text-ink-soft">Platform commission ({pricing.platform_commission_bps / 100}%)</dt>
            <dd className="text-right">−{money(pricing.platform_commission_cents)}</dd>
            <dt className="border-t border-line pt-2 font-semibold">Your earnings</dt>
            <dd className="border-t border-line pt-2 text-right font-semibold">{money(pricing.owner_net_earnings_cents)}</dd>
          </dl>
        </section>

        {/* S6-05: after the earnings. The owner reads what the booking is
            worth first, then what to weigh against it. */}
        {request.risk && <BookingRiskPanel risk={request.risk} />}
      </div>

      <div className="mt-8">
        {request.status === "PENDING"
          ? <>
              <BookingRequestDecision kind={request.kind} bookingId={request.id} expiresInSeconds={request.expires_in_seconds} />
              {/* S6-05 Scenario 3: the third option, beside accept and
                  decline.
                  Offered only on a Medium or High request, as the story
                  asks - asking a renter with a clean record for twice the
                  deposit is a cost to them with nothing behind it. An offer
                  already made still shows whatever the rating, so an owner
                  waiting on one does not lose sight of it.
                  Single listings only: a bundle's deposit is the sum of its
                  items' and doubling it is a different conversation. */}
              {request.kind === "BOOKING"
                && (pricing.deposit_cents ?? 0) > 0
                && (request.deposit_offer || (request.risk && request.risk.level !== "LOW")) && (
                <HigherDepositOffer
                  bookingId={request.id}
                  offer={request.deposit_offer}
                  depositCents={pricing.deposit_cents ?? 0}
                  side="owner"
                />
              )}
            </>
          : request.status === "CANCELLED" && request.cancellation_outcome
            // Someone who opens a notification about a cancelled request is told what happened and why.
            ? <EmptyState title="This request was cancelled" body={cancelledBody(request.cancellation_outcome)} />
            : <EmptyState title="Already answered" body={`This request is ${BOOKING_STATUS_LABELS[request.status].toLowerCase()}.`} />}
      </div>
    </>
  );
}
