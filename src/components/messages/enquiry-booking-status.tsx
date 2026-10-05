"use client";

import { useState } from "react";
import { Badge, Button } from "@/components/ui";
import { BOOKING_STATUS_BADGE_VARIANT, BOOKING_STATUS_LABELS, RETRYABLE_BOOKING_STATUSES, type Booking } from "@/lib/bookings";
import { formatDate } from "@/lib/format";
import type { UnavailableDate } from "@/lib/listings";
import { WithdrawRequestButton } from "@/components/bookings/withdraw-request-button";
import { BookingRequestModal } from "./booking-request-modal";

const HELPER_TEXT: Partial<Record<Booking["status"], string>> = {
  PENDING: "Waiting for the owner to respond.",
  DECLINED: "The owner declined this request.",
  CANCELLED: "This request was withdrawn.",
  EXPIRED: "Nobody responded in time.",
};

/**
 * The enquiry thread's own booking-request lifecycle: request, pending,
 * declined-with-retry. Renders nothing once a booking reaches
 * CONFIRMED/ACTIVE/COMPLETED - the page swaps the composer itself for a
 * banner pointing at the booking thread at that point (see
 * ConversationThreadPanel's replaceComposerWith), so there's nothing left
 * for this card to add.
 *
 * `initialBooking` is the most recent booking for this listing/renter pair
 * as of page load (derived client-side from the bookings list rather than
 * the conversation's own booking_id, which only links once a booking is
 * confirmed - see app/messages/[id]/page.tsx). Submitting a new request
 * updates local state immediately via BookingRequestModal's onSuccess,
 * the same optimistic-update pattern MessageComposer's onSent already uses
 * for a sent message.
 */
export function EnquiryBookingStatus({
  initialBooking,
  listingId,
  availableDates,
  unavailableDates,
  minRentalDays,
  maxRentalDays,
}: {
  initialBooking: Booking | null;
  listingId: string;
  availableDates: string[];
  unavailableDates: UnavailableDate[];
  minRentalDays: number | null;
  maxRentalDays: number | null;
}) {
  const [booking, setBooking] = useState(initialBooking);
  const [modalOpen, setModalOpen] = useState(false);

  if (booking && booking.status !== "PENDING" && !RETRYABLE_BOOKING_STATUSES.includes(booking.status)) {
    return null;
  }

  const canRequest = !booking || RETRYABLE_BOOKING_STATUSES.includes(booking.status);

  return (
    <div className="border-b border-line p-3">
      <div className="rounded-2xl border border-line bg-surface-muted p-4">
        {booking ? (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Badge variant={BOOKING_STATUS_BADGE_VARIANT[booking.status]}>{BOOKING_STATUS_LABELS[booking.status]}</Badge>
              <p className="mt-2 text-sm font-medium text-ink">
                {formatDate(booking.start_date)} – {formatDate(booking.end_date)}
              </p>
              <p className="mt-0.5 text-xs text-ink-soft">{HELPER_TEXT[booking.status]}</p>
            </div>
            {booking.status === "PENDING" && <WithdrawRequestButton bookingId={booking.id} />}
          </div>
        ) : (
          <p className="text-sm text-ink-soft">Ready to lock in your dates?</p>
        )}

        {canRequest && (
          <Button variant="outline" className="mt-3 w-full px-3 py-1.5 text-xs sm:w-auto" onClick={() => setModalOpen(true)}>
            Request to book
          </Button>
        )}
      </div>

      {modalOpen && (
        <BookingRequestModal
          listingId={listingId}
          availableDates={availableDates}
          unavailableDates={unavailableDates}
          minRentalDays={minRentalDays}
          maxRentalDays={maxRentalDays}
          onClose={() => setModalOpen(false)}
          onSuccess={(created) => setBooking(created)}
        />
      )}
    </div>
  );
}
