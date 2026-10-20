import type { Booking } from "@/lib/bookings";
import { formatDateTime, todayIso } from "@/lib/format";

/**
 * Pickup handover confirmation (S3-02): mirrors the handover routes in
 * app/routers/bookings.py.
 *
 * A confirmed rental starts once the renter and the owner both confirm the
 * item changed hands, and neither can until the renter's pickup photos (S3-01)
 * are complete. Neither side can start the rental alone.
 */

/** Set on confirmed and active single bookings in the lists. */
export type HandoverState = {
  /** Null until the renter starts the pickup photos. */
  inspection_status: "IN_PROGRESS" | "COMPLETED" | null;
  renter_confirmed_at: string | null;
  owner_confirmed_at: string | null;
};

/** What POST /bookings/{id}/handover-confirmation answers with. */
export type HandoverConfirmation = HandoverState & {
  booking_id: string;
  status: Booking["status"];
  flagged_at: string | null;
};

export type HandoverViewer = "renter" | "owner";

/**
 * Whether this side still has a handover confirmation to give: the rental has
 * reached its start date, the pickup photos are in, and they have not
 * confirmed already. The server re-checks all three.
 */
export function canConfirmHandover(
  booking: Pick<Booking, "status" | "start_date" | "handover_state">,
  viewer: HandoverViewer,
  today: string = todayIso(),
): boolean {
  const state = booking.handover_state;
  if (booking.status !== "CONFIRMED" || !state || state.inspection_status !== "COMPLETED") return false;
  if (booking.start_date > today) return false;
  return !(viewer === "renter" ? state.renter_confirmed_at : state.owner_confirmed_at);
}

/**
 * One line on where a confirmed rental's handover stands, for whoever is
 * reading - or null when the booking's usual next step says enough.
 */
export function handoverStatusLine(
  state: HandoverState,
  viewer: HandoverViewer,
  startDate: string,
  today: string = todayIso(),
): string | null {
  const mine = viewer === "renter" ? state.renter_confirmed_at : state.owner_confirmed_at;
  const theirs = viewer === "renter" ? state.owner_confirmed_at : state.renter_confirmed_at;
  const other = viewer === "renter" ? "the owner" : "the renter";
  if (state.inspection_status !== "COMPLETED") {
    if (viewer === "renter") {
      return state.inspection_status === "IN_PROGRESS"
        ? "Finish the pickup photos before confirming the handover."
        : "Take the pickup photos, then confirm the handover.";
    }
    return "The renter's pickup photos are needed before the handover can be confirmed.";
  }
  if (mine && !theirs) return `You confirmed the handover on ${formatDateTime(mine)}. Waiting for ${other} to confirm.`;
  if (theirs && !mine) {
    return viewer === "renter"
      ? `The owner confirmed the handover on ${formatDateTime(theirs)}. Confirm it too to start the rental.`
      : `The renter confirmed the handover on ${formatDateTime(theirs)}. Check the pickup photos, then confirm the handover.`;
  }
  if (!mine && !theirs) {
    if (startDate > today) return "You can confirm the handover from the rental start date.";
    return viewer === "renter"
      ? "Pickup photos done. Confirm the handover once you have the item."
      : "The renter's pickup photos are in. Check them, then confirm the handover.";
  }
  return null;
}

/** Where an owner reads the pickup photos before confirming. */
export function ownerPickupPhotosPath(bookingId: string): `/listings/mine/bookings/${string}/pickup` {
  return `/listings/mine/bookings/${bookingId}/pickup`;
}
