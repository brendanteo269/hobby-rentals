import type { Booking } from "@/lib/bookings";
import { formatDate, formatDateTime, todayIso } from "@/lib/format";

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

/** Whether the rental's dates are over: the handover can no longer be confirmed, only sorted out by an administrator. */
export function handoverPeriodOver(booking: Pick<Booking, "end_date">, today: string = todayIso()): boolean {
  return booking.end_date < today;
}

/** Said in place of the next step once the dates have passed with the handover unconfirmed. */
export const HANDOVER_PERIOD_OVER_NOTE =
  "The rental period ended before the handover was confirmed. An administrator has been asked to look at it.";

/**
 * Whether this side still has a handover confirmation to give: the rental has
 * is within its dates (from the start date to the end date), the pickup
 * photos are in, and they have not confirmed already. The server re-checks
 * all of it.
 */
export function canConfirmHandover(
  booking: Pick<Booking, "status" | "start_date" | "end_date" | "handover_state">,
  viewer: HandoverViewer,
  today: string = todayIso(),
): boolean {
  const state = booking.handover_state;
  if (booking.status !== "CONFIRMED" || !state || state.inspection_status !== "COMPLETED") return false;
  if (booking.start_date > today || handoverPeriodOver(booking, today)) return false;
  return !(viewer === "renter" ? state.renter_confirmed_at : state.owner_confirmed_at);
}

/**
 * Whether either side has confirmed the handover. From then on the item has
 * changed hands for that side, so neither can cancel; the server refuses it
 * too (HANDOVER_CONFIRMED).
 */
export function handoverConfirmed(booking: Pick<Booking, "handover_state">): boolean {
  const state = booking.handover_state;
  return Boolean(state?.renter_confirmed_at || state?.owner_confirmed_at);
}

/**
 * Why a confirmed booking can no longer be cancelled - the handover is
 * confirmed, or the rental has reached its start date - or null while it can.
 * Shown as the hover text on the disabled cancel button; the server refuses
 * on the same rules (HANDOVER_CONFIRMED, RENTAL_STARTED).
 */
export function cancelBlockedReason(
  booking: Pick<Booking, "status" | "start_date" | "handover_state">,
  today: string = todayIso(),
): string | null {
  if (booking.status !== "CONFIRMED") return null;
  if (handoverConfirmed(booking)) return "Cannot cancel: the handover has been confirmed.";
  if (booking.start_date <= today) return "Cannot cancel: the rental has reached its start date.";
  return null;
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
        : "Take the pickup photos once you have received the item.";
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

/**
 * How long after the start date a handover may stay unconfirmed before an
 * administrator is asked to look: mirrors handover_confirmation_window_hours
 * in the backend's config, which is what actually enforces it.
 */
export const HANDOVER_CONFIRMATION_WINDOW_HOURS = 24;

export type HandoverStepState = "done" | "current" | "upcoming";

export type HandoverStep = { key: string; label: string; state: HandoverStepState; detail?: string };

/**
 * The handover as a row of steps for whoever is reading. The current step is
 * the first one not yet done, so it stays right whichever side confirmed
 * first. The rental starting is never done here: once it has, the booking is
 * no longer confirmed and no tracker is shown.
 */
export function handoverSteps(
  booking: Pick<Booking, "start_date" | "handover_state">,
  viewer: HandoverViewer,
  today: string = todayIso(),
): HandoverStep[] {
  const state = booking.handover_state;
  const photosDone = state?.inspection_status === "COMPLETED";
  const renterAt = state?.renter_confirmed_at ?? null;
  const ownerAt = state?.owner_confirmed_at ?? null;
  const notYet = booking.start_date > today ? `From ${formatDate(booking.start_date)}` : undefined;
  const at = (iso: string | null) => (iso ? formatDateTime(iso) : undefined);

  const mine = viewer === "renter" ? renterAt : ownerAt;
  const theirs = viewer === "renter" ? ownerAt : renterAt;

  const photos =
    viewer === "renter"
      ? { label: "Pickup photos", detail: photosDone ? undefined : state?.inspection_status === "IN_PROGRESS" ? "Finish all four" : "Take them now" }
      : { label: "Renter's photos", detail: photosDone ? undefined : "Waiting for the renter" };

  const raw: Array<{ key: string; label: string; done: boolean; detail?: string }> = [
    { key: "booked", label: "Booked", done: true },
    { key: "photos", label: photos.label, done: photosDone, detail: photos.detail },
  ];
  if (viewer === "renter") {
    raw.push(
      { key: "mine", label: "You confirm", done: Boolean(mine), detail: mine ? at(mine) : photosDone ? notYet ?? "Once you have the item" : notYet },
      { key: "theirs", label: "Owner confirms", done: Boolean(theirs), detail: theirs ? at(theirs) : mine ? "Waiting for the owner" : undefined },
    );
  } else {
    raw.push(
      { key: "theirs", label: "Renter confirms", done: Boolean(theirs), detail: theirs ? at(theirs) : photosDone ? "Waiting for the renter" : undefined },
      { key: "mine", label: "You confirm", done: Boolean(mine), detail: mine ? at(mine) : photosDone ? notYet ?? "Check the photos first" : notYet },
    );
  }
  raw.push({ key: "starts", label: "Rental starts", done: false });

  const currentIndex = raw.findIndex((step) => !step.done);
  return raw.map(({ done, ...step }, index) => ({
    ...step,
    state: done ? "done" : index === currentIndex ? "current" : "upcoming",
  }));
}
