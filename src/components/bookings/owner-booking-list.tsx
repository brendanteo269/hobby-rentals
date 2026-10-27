"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, ButtonLink } from "@/components/ui";
import { changeBookingStatus, type BookingActionResult } from "@/app/bookings/actions";
import { AddToCalendarButton } from "@/components/bookings/add-to-calendar-button";
import { MessageButton } from "@/components/messages/message-button";
import { ExtensionRequestDecision } from "@/components/bookings/extension-request-decision";
import { OverdueNotice } from "@/components/bookings/overdue-notice";
import { ConfirmReturnButton } from "@/components/bookings/confirm-return-button";
import { TrustedRenterBadge } from "@/components/bookings/trusted-renter-badge";
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
import { canConfirmReturn, returnStatusLine } from "@/lib/returns";
import { canConfirmHandover, cancelBlockedReason, ownerPickupPhotosPath } from "@/lib/handover";
import { HandoverTracker } from "@/components/bookings/handover-tracker";
import { BlockedCancelButton } from "@/components/bookings/cancel-booking-button";
import { ConfirmHandoverButton } from "@/components/bookings/confirm-handover-button";
import { ownerConditionReportPath, scanBadge } from "@/lib/condition-scans";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/support";
import { reviewPath, type ReviewEligibility } from "@/lib/reviews";

// A request is answered from its review page, where the owner sees the renter
// and the earnings and has to give a reason to decline. A rental starts (S3-02)
// and is returned (S3-04) by both parties confirming, not by a status change.

/** Who asked, for an owner reading a list of requests on one listing. */
export function requesterName(booking: Pick<Booking, "renter_name">): string {
  return booking.renter_name || "A renter";
}

/**
 * What the link to a returned booking's condition page says, or null when it
 * has nothing to show. The damage claim (S3-06) is made and followed there
 * whether or not the AI checked the return, so a booking without a scan still
 * links once a claim can be made or has been.
 */
function conditionPageLabel(booking: Booking): string | null {
  if (booking.condition_scan) return "Condition report";
  if (booking.settlement_state?.dispute) return "View claim";
  if (canReportDamage(booking.settlement_state)) return "Report damage";
  return null;
}

export function OwnerBookingList({ bookings, reviewEligibility = [] }: { bookings: Booking[]; reviewEligibility?: ReviewEligibility[] }) {
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
          // The id is what a notification's link scrolls to
          // (owner_booking_list_path in the backend's catalog).
          return <li key={booking.id} id={`booking-${booking.id}`} className="flex scroll-mt-24 flex-wrap items-center justify-between gap-2 bg-surface-muted px-3 py-2 text-sm data-[hash-target]:ring-1 data-[hash-target]:ring-ink">
            <span>
              <span className="font-medium">{requesterName(booking)}</span>
              {/* S4-06: beside the name, so an owner scanning a list of
                  requests can see who is trusted without opening each one. */}
              <TrustedRenterBadge trusted={booking.renter_trusted} className="ml-2 align-middle" /> <span className="text-ink-soft">· {formatDate(booking.start_date)} – {formatDate(booking.end_date)} · {BOOKING_STATUS_LABELS[booking.status]}{booking.settlement_state?.settlement ? " · Settled" : booking.payment_status && ` · ${PAYMENT_STATUS_LABELS[booking.payment_status]}`}</span>
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
              {booking.status === "ACTIVE" && booking.return_state && returnStatusLine(booking.return_state, "owner") && (
                <span className="block text-ink-soft">{returnStatusLine(booking.return_state, "owner")}</span>
              )}
              {booking.cancellation_outcome && (
                <span className="block text-ink-soft">{cancellationOutcomeLine(booking.cancellation_outcome, "owner")}</span>
              )}
              {booking.settlement_state && (
                <span className="block text-ink-soft">{settlementLine(booking.settlement_state, "owner")}</span>
              )}
              {booking.condition_scan && (
                <Badge variant={scanBadge(booking.condition_scan).tone} className="mt-1">
                  {scanBadge(booking.condition_scan).label}
                </Badge>
              )}
            </span>
            <span className="flex gap-2">
              <AddToCalendarButton booking={booking} />
              {booking.status === "CONFIRMED" && booking.handover_state?.inspection_status === "COMPLETED" && (
                <ButtonLink href={ownerPickupPhotosPath(booking.id)} variant="outline" className="px-3 py-1.5 text-xs">
                  Pickup photos
                </ButtonLink>
              )}
              {canConfirmHandover(booking, "owner") && <ConfirmHandoverButton bookingId={booking.id} />}
              {canConfirmReturn(booking, "owner") && <ConfirmReturnButton bookingId={booking.id} />}
              {conditionPageLabel(booking) && (
                <ButtonLink href={ownerConditionReportPath(booking.id)} variant="outline" className="px-3 py-1.5 text-xs">
                  {conditionPageLabel(booking)}
                </ButtonLink>
              )}
              {booking.status === "PENDING" && <ButtonLink href={requestReviewPath("BOOKING", booking.id)} className="px-3 py-1.5 text-xs">Review request</ButtonLink>}
              {booking.status === "CONFIRMED" &&
                (cancelBlockedReason(booking) ? (
                  <BlockedCancelButton label="Cancel booking" reason={cancelBlockedReason(booking)!} />
                ) : (
                  <Button variant="outline" className="px-3 py-1.5 text-xs" disabled={isPending} onClick={() => update(booking.id, "CANCELLED")}>Cancel booking</Button>
                ))}
              {reviewEligibility.find((item) => item.booking_id === booking.id) && <ButtonLink href={reviewPath(reviewEligibility.find((item) => item.booking_id === booking.id)!)} variant="accent" className="px-3 py-1.5 text-xs">Rate renter</ButtonLink>}
              {MESSAGEABLE_BOOKING_STATUSES.includes(booking.status) && (
                <MessageButton target={{ kind: "booking", bookingId: booking.id }} className="px-3 py-1.5 text-xs" />
              )}
            </span>
            {/* S3-18: the late fee this rental has run up, on its own line so
                it is not lost among the status text above. */}
            {booking.status === "CONFIRMED" && booking.handover_state && (
              <div className="w-full py-2">
                <HandoverTracker booking={booking} viewer="owner" />
              </div>
            )}
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
