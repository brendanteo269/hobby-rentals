import type { Booking } from "@/lib/bookings";
import { formatDateTime } from "@/lib/format";

/**
 * Guided return photo capture: mirrors app/routers/returns.py.
 *
 * The renter photographs four angles of the item as they return it, each
 * against the owner's baseline photo as an overlay. Every photo is validated
 * by the server - quality, timestamp and angle - and a refused one comes back
 * with the issue to show and the angle to retake.
 */

export type ReturnAngle = "front" | "back" | "top" | "underside";

export type ReturnPhotoIssueCode =
  | "MISSING"
  | "TOO_LARGE"
  | "UNREADABLE"
  | "LOW_RESOLUTION"
  | "TOO_DARK"
  | "OVEREXPOSED"
  | "BLURRY"
  | "TIMESTAMP_MISMATCH"
  | "WRONG_ANGLE";

export type ReturnPhotoIssue = { code: ReturnPhotoIssueCode; message: string };

export type ReturnPhoto = {
  id: string;
  inspection_id: string;
  angle: ReturnAngle;
  photo_key: string;
  /** Short-lived: return photos are never publicly readable. */
  photo_url: string;
  outcome: "ACCEPTED" | "REJECTED";
  rejection_code?: ReturnPhotoIssueCode | null;
  rejection_message?: string | null;
  received_at: string;
};

export type InspectionAngle = {
  angle: ReturnAngle;
  label: string;
  /** The owner's baseline photo to line the item up against; null if the listing has none. */
  baseline_overlay_url: string | null;
  accepted_photo: ReturnPhoto | null;
  /** Why the latest attempt at this angle was refused, so a reloaded page still says. */
  last_rejection: ReturnPhotoIssue | null;
};

export type ReturnInspection = {
  id: string;
  booking_id: string;
  listing_id: string;
  status: "IN_PROGRESS" | "COMPLETED";
  started_at: string;
  completed_at: string | null;
  /** READY once complete: queued for the AI comparison against the baseline. */
  comparison_status: "READY" | "PROCESSING" | "DONE" | "FAILED" | null;
  /** In capture order: Front, Back, Top, Base/Underside. */
  angles: InspectionAngle[];
  /** The first angle still without an accepted photo; null when all four are in. */
  next_angle: ReturnAngle | null;
};

export type ReturnPhotoResult = {
  accepted: boolean;
  issue: ReturnPhotoIssue | null;
  required_angle: ReturnAngle | null;
  required_angle_label: string | null;
  photo: ReturnPhoto;
};

/**
 * Whether the renter can photograph this booking's return. The renter's
 * bookings list holds no bundle components, so ACTIVE is the whole rule; the
 * server re-checks.
 */
export function canStartReturnInspection(booking: Pick<Booking, "status">): boolean {
  return booking.status === "ACTIVE";
}

/** The browser's offset from UTC, east positive, for reading EXIF times without a zone. */
export function clientUtcOffsetMinutes(now = new Date()): number {
  return -now.getTimezoneOffset();
}

/** S3-04: where a booking's return stands. Set on active and returned bookings in the lists. */
export type ReturnState = {
  /** Null until the renter starts the return photos. */
  inspection_status: "IN_PROGRESS" | "COMPLETED" | null;
  renter_confirmed_at: string | null;
  owner_confirmed_at: string | null;
};

/** What POST /bookings/{id}/return-confirmation answers with. */
export type ReturnConfirmation = ReturnState & {
  booking_id: string;
  status: Booking["status"];
  returned_at: string | null;
  claim_window_ends_at: string | null;
};

export type ReturnViewer = "renter" | "owner";

/** Whether this side still has a return confirmation to give. The server re-checks, photos included. */
export function canConfirmReturn(booking: Pick<Booking, "status" | "return_state">, viewer: ReturnViewer): boolean {
  if (booking.status !== "ACTIVE" || !booking.return_state) return false;
  return !(viewer === "renter" ? booking.return_state.renter_confirmed_at : booking.return_state.owner_confirmed_at);
}

/**
 * One line on where an active rental's return stands, for whoever is
 * reading - or null before anything has happened, when the booking's usual
 * next step says enough.
 */
export function returnStatusLine(state: ReturnState, viewer: ReturnViewer): string | null {
  const mine = viewer === "renter" ? state.renter_confirmed_at : state.owner_confirmed_at;
  const theirs = viewer === "renter" ? state.owner_confirmed_at : state.renter_confirmed_at;
  const other = viewer === "renter" ? "the owner" : "the renter";
  if (state.inspection_status !== "COMPLETED") {
    if (viewer === "renter") {
      return state.inspection_status === "IN_PROGRESS" ? "Finish the return photos before confirming the return." : null;
    }
    return "The renter's return photos are needed before the return can be confirmed.";
  }
  if (mine && !theirs) return `You confirmed the return on ${formatDateTime(mine)}. Waiting for ${other} to confirm.`;
  if (theirs && !mine) {
    return viewer === "renter"
      ? `The owner confirmed the return on ${formatDateTime(theirs)}. Confirm it too to finish the rental.`
      : `The renter confirmed the return on ${formatDateTime(theirs)}. Check the item, then confirm the return.`;
  }
  if (!mine && !theirs) {
    return viewer === "renter"
      ? "Return photos done. Confirm the return once the owner has the item."
      : "The renter's return photos are in. Check the item, then confirm the return.";
  }
  return null;
}

/** How many of the four angles have an accepted photo. */
export function acceptedCount(inspection: Pick<ReturnInspection, "angles">): number {
  return inspection.angles.filter((angle) => angle.accepted_photo).length;
}
