import type { Booking } from "@/lib/bookings";

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

/** How many of the four angles have an accepted photo. */
export function acceptedCount(inspection: Pick<ReturnInspection, "angles">): number {
  return inspection.angles.filter((angle) => angle.accepted_photo).length;
}
