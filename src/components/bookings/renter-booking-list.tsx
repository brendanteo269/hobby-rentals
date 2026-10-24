import Link from "next/link";
import type { Route } from "next";
import { Badge, ButtonLink } from "@/components/ui";
import { MessageButton } from "@/components/messages/message-button";
import { hasLiveOffer, WAITLIST_STATUS_LABELS, type WaitlistEntry } from "@/lib/waitlist";
import {
  BOOKING_STATUS_BADGE_VARIANT,
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_NEXT_STEP,
  BUNDLE_STATUS_NEXT_STEP,
  MESSAGEABLE_BOOKING_STATUSES,
  PAYMENT_STATUS_LABELS,
  type Booking,
} from "@/lib/bookings";
import type { BundleBooking } from "@/lib/bundles";
import { BlockedCancelButton, CancelBookingButton } from "@/components/bookings/cancel-booking-button";
import { OverdueNotice } from "@/components/bookings/overdue-notice";
import { cancellationOutcomeLine } from "@/lib/cancellations";
import { claimPendingRenter, renterClaimPath, settlementLine } from "@/lib/settlement";
import { ExtendBookingButton } from "@/components/bookings/extend-booking-button";
import { canConfirmHandover, cancelBlockedReason } from "@/lib/handover";
import { HandoverTracker } from "@/components/bookings/handover-tracker";
import { ConfirmHandoverButton } from "@/components/bookings/confirm-handover-button";
import { canConfirmReturn, canStartPickupInspection, canStartReturnInspection, returnStatusLine } from "@/lib/returns";
import { ConfirmReturnButton } from "@/components/bookings/confirm-return-button";
import { canRequestExtension } from "@/lib/extensions";
import { HashTargetHighlight } from "@/components/hash-target-highlight";
import { formatDate, formatDateTime } from "@/lib/format";
import { reviewPath, type ReviewEligibility } from "@/lib/reviews";
import { rentalRowId } from "@/lib/rentals";

/**
 * Every booking the renter has made, single items and bundles alike, each with
 * the actions its status allows. Each row carries the id a notification's link
 * scrolls to (rentalRowId), so the list must render on the page those links
 * name (the renter portal's Bookings tab).
 */
export function RenterBookingList({
  bookings,
  bundleBookings,
  reviewEligibility,
}: {
  bookings: Booking[];
  /** S2-20: a request for a whole set, shown beside the single-item ones. */
  bundleBookings: BundleBooking[];
  reviewEligibility: ReviewEligibility[];
}) {
  return (
    <>
      <HashTargetHighlight />
      <ul className="space-y-3">
        {bundleBookings.map((booking) => (
          // The id is what a bundle notification's link scrolls to
          // (renter_bundle_booking_path in the backend's catalog).
          <li
            key={booking.id}
            id={rentalRowId("BUNDLE", booking.id)}
            className="flex scroll-mt-24 flex-wrap items-center justify-between gap-3 card p-4 data-[hash-target]:border-ink data-[hash-target]:ring-1 data-[hash-target]:ring-ink"
          >
            <div>
              <Link href={`/bundles/${booking.bundle_id}`} className="font-medium hover:underline">
                {booking.bundle_name ?? "View bundle"}
              </Link>
              <p className="mt-1 text-sm text-ink-soft">
                {formatDate(booking.start_date)} – {formatDate(booking.end_date)}
              </p>
              {/* A bundle booking covers several listings at once, which the
                  dates alone would not tell the renter. */}
              <p className="mt-1 text-xs text-ink-soft">
                {booking.items.length} items · {booking.items.map((item) => item.listing_name ?? "an item").join(", ")}
              </p>
              <p className="mt-1 text-sm text-ink">
                {booking.cancellation_outcome
                  ? cancellationOutcomeLine(booking.cancellation_outcome, "renter")
                  : booking.settlement_state
                    ? settlementLine(booking.settlement_state, "renter")
                    : BUNDLE_STATUS_NEXT_STEP[booking.status]}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant={BOOKING_STATUS_BADGE_VARIANT[booking.status]}>{BOOKING_STATUS_LABELS[booking.status]}</Badge>
              <CancelBookingButton kind="bundle" id={booking.id} status={booking.status} />
              {reviewEligibility.find((item) => item.bundle_booking_id === booking.id) && <ButtonLink href={reviewPath(reviewEligibility.find((item) => item.bundle_booking_id === booking.id)!)} variant="accent" className="px-3 py-1.5 text-xs">Rate owner</ButtonLink>}
              {booking.status === "COMPLETED" && (
                <ButtonLink href={`/bundles/${booking.bundle_id}`} variant="outline" className="px-3 py-1.5 text-xs">
                  Rent again
                </ButtonLink>
              )}
            </div>
          </li>
        ))}
        {bookings.map((booking) => (
          // The id is what a notification's link scrolls to
          // (renter_booking_path in the backend's catalog).
          <li
            key={booking.id}
            id={rentalRowId("BOOKING", booking.id)}
            className="flex scroll-mt-24 flex-wrap items-start justify-between gap-3 card p-4 data-[hash-target]:border-ink data-[hash-target]:ring-1 data-[hash-target]:ring-ink"
          >
            <div className="min-w-0 flex-1 basis-72">
              <Link href={`/listings/${booking.listing_id}`} className="font-medium hover:underline">
                {booking.listing_name ?? "View listing"}
              </Link>
              <p className="mt-1 text-sm text-ink-soft">
                {formatDate(booking.start_date)} – {formatDate(booking.end_date)}
                {booking.payment_status && ` · ${PAYMENT_STATUS_LABELS[booking.payment_status]}`}
              </p>
              {/* A confirmed booking with its handover tracker says what is next there. */}
              {!(booking.status === "CONFIRMED" && booking.handover_state) && (
                <p className="mt-1 text-sm text-ink">
                  {booking.cancellation_outcome
                    ? cancellationOutcomeLine(booking.cancellation_outcome, "renter")
                    : booking.settlement_state
                      ? settlementLine(booking.settlement_state, "renter")
                      : BOOKING_STATUS_NEXT_STEP[booking.status]}
                </p>
              )}
              {booking.confirmed_meetup_location && (
                <p className="mt-1 text-sm text-ink-soft">
                  Meetup: {booking.confirmed_meetup_location}
                  {booking.confirmed_meetup_time && `, ${formatDateTime(booking.confirmed_meetup_time)}`}
                </p>
              )}
              {booking.status === "CONFIRMED" && booking.handover_state && (
                <div className="mt-4">
                  <HandoverTracker booking={booking} viewer="renter" />
                </div>
              )}
              {booking.status === "ACTIVE" && booking.return_state && returnStatusLine(booking.return_state, "renter") && (
                <p className="mt-1 text-sm text-ink-soft">{returnStatusLine(booking.return_state, "renter")}</p>
              )}
              <OverdueNotice booking={booking} side="renter" />
              {booking.pending_extension && (
                <p className="mt-1 text-sm text-ink-soft">
                  Extension requested: {booking.pending_extension.additional_days} more{" "}
                  {booking.pending_extension.additional_days === 1 ? "day" : "days"}, to{" "}
                  {formatDate(booking.pending_extension.new_end_date)} — waiting on the owner.
                </p>
              )}
            </div>
            <Badge variant={BOOKING_STATUS_BADGE_VARIANT[booking.status]}>{BOOKING_STATUS_LABELS[booking.status]}</Badge>
            {/* One row of actions under the details. Only the next step is
                accent; the rest are outline so it is obvious what to do. */}
            <div className="flex w-full flex-wrap items-center justify-end gap-2 border-t border-line pt-3 empty:hidden">
              {cancelBlockedReason(booking) ? (
                <BlockedCancelButton label="Cancel booking" reason={cancelBlockedReason(booking)!} />
              ) : (
                <CancelBookingButton kind="booking" id={booking.id} status={booking.status} />
              )}
              {canRequestExtension(booking) && (
                <ExtendBookingButton bookingId={booking.id} endDate={booking.end_date} />
              )}
              {canStartPickupInspection(booking) && (
                <ButtonLink
                  href={`/bookings/${booking.id}/pickup` as Route}
                  variant={booking.pickup_inspection_status === "COMPLETED" ? "outline" : "accent"}
                  className="px-3 py-1.5 text-xs"
                >
                  {booking.pickup_inspection_status === "COMPLETED"
                    ? "View pickup photos"
                    : booking.pickup_inspection_status === "IN_PROGRESS"
                      ? "Continue pickup photos"
                      : "Pickup photos"}
                </ButtonLink>
              )}
              {canConfirmHandover(booking, "renter") && <ConfirmHandoverButton bookingId={booking.id} />}
              {canStartReturnInspection(booking) && (
                <ButtonLink
                  href={`/bookings/${booking.id}/return` as Route}
                  variant={booking.return_state?.inspection_status === "COMPLETED" ? "outline" : "accent"}
                  className="px-3 py-1.5 text-xs"
                >
                  {booking.return_state?.inspection_status === "COMPLETED" ? "View return photos" : "Return photos"}
                </ButtonLink>
              )}
              {booking.settlement_state?.dispute?.booking_id && (
                <ButtonLink
                  href={renterClaimPath(booking.id)}
                  variant={claimPendingRenter(booking.settlement_state.dispute) ? "accent" : "outline"}
                  className="px-3 py-1.5 text-xs"
                >
                  {claimPendingRenter(booking.settlement_state.dispute) ? "Review claim" : "View claim"}
                </ButtonLink>
              )}
              {canConfirmReturn(booking, "renter") && booking.return_state?.inspection_status === "COMPLETED" && (
                <ConfirmReturnButton bookingId={booking.id} />
              )}
              {reviewEligibility.find((item) => item.booking_id === booking.id) && <ButtonLink href={reviewPath(reviewEligibility.find((item) => item.booking_id === booking.id)!)} variant="accent" className="px-3 py-1.5 text-xs">Rate owner</ButtonLink>}
              {MESSAGEABLE_BOOKING_STATUSES.includes(booking.status) && (
                <MessageButton target={{ kind: "booking", bookingId: booking.id }} className="px-3 py-1.5 text-xs" />
              )}
              {booking.status === "COMPLETED" && (
                <ButtonLink href={`/listings/${booking.listing_id}`} variant="outline" className="px-3 py-1.5 text-xs">
                  Rent again
                </ButtonLink>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * S2-15: dates the renter is queueing for. Queue places are not bookings -
 * nothing is held and no dates are reserved - so they are listed apart from
 * the rentals.
 */
export function RenterWaitlist({ waitlist }: { waitlist: WaitlistEntry[] }) {
  return (
    <ul className="space-y-3">
      {waitlist.map((entry) => (
        <li
          key={entry.id}
          className={`flex flex-wrap items-center justify-between gap-3 border p-4 ${
            hasLiveOffer(entry) ? "border-accent bg-accent-soft" : "border-line bg-white"
          }`}
        >
          <div>
            <Link href={`/listings/${entry.listing_id}`} className="font-medium hover:underline">
              {entry.listing_name ?? "View listing"}
            </Link>
            <p className="mt-1 text-sm text-ink-soft">
              {formatDate(entry.start_date)} – {formatDate(entry.end_date)}
            </p>
            {hasLiveOffer(entry) && (
              <p className="mt-1 text-xs text-accent-dark">
                Yours to book until {formatDateTime(entry.offer_expires_at!)}.
              </p>
            )}
          </div>
          <Badge variant={hasLiveOffer(entry) ? "accent" : "neutral"}>
            {WAITLIST_STATUS_LABELS[entry.status]}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
