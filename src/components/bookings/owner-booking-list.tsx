"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui";
import { changeBookingStatus, type BookingActionResult } from "@/app/bookings/actions";
import { MessageButton } from "@/components/messages/message-button";
import { ExtensionRequestDecision } from "@/components/bookings/extension-request-decision";
import { OverdueNotice } from "@/components/bookings/overdue-notice";
import { ReportDamageButton } from "@/components/bookings/report-damage-button";
import {
  BOOKING_STATUS_LABELS,
  MESSAGEABLE_BOOKING_STATUSES,
  PAYMENT_STATUS_LABELS,
  requestReviewPath,
  type Booking,
  type BookingStatus,
} from "@/lib/bookings";
import { cancellationOutcomeLine, HANDED_OVER_NOTE } from "@/lib/cancellations";
import { formatDate, formatDateTime } from "@/lib/format";
import { canReportDamage, settlementLine } from "@/lib/settlement";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/support";

// A request is answered from its review page, where the owner sees the renter
// and the earnings and has to give a reason to decline.
const NEXT_ACTION: Partial<Record<BookingStatus, { status: BookingStatus; label: string }>> = {
  CONFIRMED: { status: "ACTIVE", label: "Start rental" },
  ACTIVE: { status: "COMPLETED", label: "Mark returned" },
};

/** Who asked, for an owner reading a list of requests on one listing. */
export function requesterName(booking: Pick<Booking, "renter_name">): string {
  return booking.renter_name || "A renter";
}

export function OwnerBookingList({ bookings }: { bookings: Booking[] }) {
  // Rows always come from props. A status change refreshes the page rather
  // than patching the row from the action's response: that response is the
  // bare booking, without what the list adds to it (the renter's name, the
  // settlement state that offers Report damage once an item is returned), so
  // a patched row lost those until the page was reloaded.
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const items = bookings;

  function update(bookingId: string, nextStatus: BookingStatus) {
    startTransition(async () => {
      const result: BookingActionResult = await changeBookingStatus(bookingId, nextStatus);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  if (items.length === 0) return <p className="mt-2 text-xs text-ink-soft">No booking requests yet.</p>;

  return (
    <div className="mt-4 border-t border-line pt-4">
      <p className="eyebrow">Booking requests</p>
      {error && <p role="alert" className="mt-2 text-xs text-accent-dark">{error}</p>}
      <ul className="mt-2 space-y-2">
        {items.map((booking) => {
          const next = NEXT_ACTION[booking.status];
          // The id is what a notification's link scrolls to
          // (owner_booking_list_path in the backend's catalog).
          return <li key={booking.id} id={`booking-${booking.id}`} className="flex scroll-mt-24 flex-wrap items-center justify-between gap-2 bg-surface-muted px-3 py-2 text-sm data-[hash-target]:ring-1 data-[hash-target]:ring-ink">
            <span>
              <span className="font-medium">{requesterName(booking)}</span> <span className="text-ink-soft">· {formatDate(booking.start_date)} – {formatDate(booking.end_date)} · {BOOKING_STATUS_LABELS[booking.status]}{booking.payment_status && ` · ${PAYMENT_STATUS_LABELS[booking.payment_status]}`}</span>
              {booking.confirmed_meetup_location && (
                <span className="block text-ink-soft">
                  Meetup: {booking.confirmed_meetup_location}
                  {booking.confirmed_meetup_time && `, ${formatDateTime(booking.confirmed_meetup_time)}`}
                </span>
              )}
              {booking.status === "ACTIVE" && (
                <span className="block text-ink-soft">
                  {HANDED_OVER_NOTE} <a href={SUPPORT_MAILTO} className="underline">{SUPPORT_EMAIL}</a>
                </span>
              )}
              {booking.cancellation_outcome && (
                <span className="block text-ink-soft">{cancellationOutcomeLine(booking.cancellation_outcome, "owner")}</span>
              )}
              {booking.settlement_state && (
                <span className="block text-ink-soft">{settlementLine(booking.settlement_state, "owner")}</span>
              )}
            </span>
            <span className="flex gap-2">
              {next && <Button className="px-3 py-1.5 text-xs" disabled={isPending} onClick={() => update(booking.id, next.status)}>{next.label}</Button>}
              {booking.status === "PENDING" && <ButtonLink href={requestReviewPath("BOOKING", booking.id)} className="px-3 py-1.5 text-xs">Review request</ButtonLink>}
              {booking.status === "CONFIRMED" && <Button variant="outline" className="px-3 py-1.5 text-xs" disabled={isPending} onClick={() => update(booking.id, "CANCELLED")}>Cancel booking</Button>}
              {canReportDamage(booking.settlement_state) && booking.settlement_state?.claim_window_ends_at && (
                <ReportDamageButton kind="booking" id={booking.id} windowEndsAt={booking.settlement_state.claim_window_ends_at} />
              )}
              {MESSAGEABLE_BOOKING_STATUSES.includes(booking.status) && (
                <MessageButton target={{ kind: "booking", bookingId: booking.id }} className="px-3 py-1.5 text-xs" />
              )}
            </span>
            {/* S3-18: the late fee this rental has run up, on its own line so
                it is not lost among the status text above. */}
            <span className="w-full"><OverdueNotice booking={booking} side="owner" /></span>
            {/* S3-17: on its own line below the row's buttons - approving it
                changes the booking's dates and charges the renter, which is a
                bigger decision than the status buttons beside it. */}
            {booking.pending_extension && <ExtensionRequestDecision request={booking.pending_extension} />}
          </li>;
        })}
      </ul>
    </div>
  );
}
