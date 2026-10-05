import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, EmptyState } from "@/components/ui";
import { OwnerPortal, requireOwner } from "@/components/owner-portal";
import { BookingRequestDecision } from "@/components/bookings/booking-request-decision";
import { RequestCountdown } from "@/components/bookings/request-countdown";
import { getOwnerBookingRequest } from "@/lib/api/bookings";
import { BackendApiError } from "@/lib/api/client";
import { BOOKING_STATUS_LABELS } from "@/lib/bookings";
import { formatDate, formatMoney, formatMonthYear } from "@/lib/format";

export const metadata = { title: "Booking request — HobbyRentals" };

function money(cents: number | null) {
  return cents === null ? "—" : formatMoney(cents);
}

/** One booking request, with everything the owner decides it on. */
export default async function BookingRequestPage({ params }: { params: Promise<{ bookingId: string }> }) {
  await requireOwner();
  const { bookingId } = await params;
  let request;
  try {
    request = await getOwnerBookingRequest(bookingId);
  } catch (error) {
    // Anyone else's request is a 404 too, so this reveals nothing about it.
    if (error instanceof BackendApiError && error.status === 404) notFound();
    throw error;
  }
  const { renter, period, pricing } = request;
  const days = period.rental_days ?? 0;

  return (
    <OwnerPortal active="Bookings" title="Booking request">
      <Link href="/listings/mine/bookings" className="eyebrow hover:text-ink">← All bookings</Link>

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="heading text-2xl">
          <Link href={`/listings/${request.listing_id}`} className="hover:underline">{request.listing_name ?? "Listing"}</Link>
        </h2>
        <p className="text-sm text-ink-soft">
          {request.status === "PENDING"
            ? <RequestCountdown expiresInSeconds={request.expires_in_seconds} />
            : BOOKING_STATUS_LABELS[request.status]}
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="border border-line bg-white p-5" aria-labelledby="renter-heading">
          <p id="renter-heading" className="eyebrow">Renter</p>
          <p className="mt-2 text-lg font-semibold">{renter.display_name ?? "Unnamed member"}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={renter.email_verified ? "accent" : "neutral"}>
              {renter.email_verified ? "Email verified" : "Email not verified"}
            </Badge>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-ink-soft">Rating</dt>
            <dd>{renter.rating === null ? "No ratings yet" : `${renter.rating.toFixed(1)} (${renter.review_count})`}</dd>
            <dt className="text-ink-soft">Completed rentals</dt>
            <dd>{renter.completed_rentals}</dd>
            {renter.member_since && <>
              <dt className="text-ink-soft">Member since</dt>
              <dd>{formatMonthYear(renter.member_since)}</dd>
            </>}
          </dl>
          {renter.bio && <p className="body-copy mt-4">{renter.bio}</p>}
        </section>

        <section className="border border-line bg-white p-5" aria-labelledby="earnings-heading">
          <p id="earnings-heading" className="eyebrow">Rental and earnings</p>
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
            <dt className="text-ink-soft">Rental subtotal</dt><dd className="text-right">{money(pricing.rental_subtotal_cents)}</dd>
            <dt className="text-ink-soft">Platform fee (paid by renter)</dt><dd className="text-right">{money(pricing.platform_fee_cents)}</dd>
            <dt className="text-ink-soft">Security deposit (refundable)</dt><dd className="text-right">{money(pricing.deposit_cents)}</dd>
            <dt className="text-ink-soft">Damage protection</dt>
            <dd className="text-right">{pricing.damage_protection.selected ? formatMoney(pricing.damage_protection.fee_cents) : "Not selected"}</dd>
            <dt className="border-t border-line pt-2 font-semibold">Your earnings</dt>
            <dd className="border-t border-line pt-2 text-right font-semibold">{money(pricing.owner_net_earnings_cents)}</dd>
          </dl>
        </section>
      </div>

      <div className="mt-8">
        {request.status === "PENDING"
          ? <BookingRequestDecision bookingId={request.id} />
          : <EmptyState title="Already answered" body={`This request is ${BOOKING_STATUS_LABELS[request.status].toLowerCase()}.`} />}
      </div>
    </OwnerPortal>
  );
}
