import "server-only";

import { backendRequest } from "@/lib/api/client";
import type { InspectionStage, ReturnAngle, ReturnConfirmation, ReturnInspection, ReturnPhotoResult } from "@/lib/returns";

/** Mirrors the FastAPI routes in app/routers/returns.py. `stage` picks pickup (S3-01) or return. */

/** The booking's return inspection - completed, or the one in progress. 404 if none has been started. */
export function getReturnInspection(bookingId: string, stage: InspectionStage = "return") {
  return backendRequest<ReturnInspection>(`/bookings/${encodeURIComponent(bookingId)}/${stage}-inspection`);
}

/** Opens the capture session (an active booking for a return, a confirmed one for a pickup), or resumes the open one. */
export function startReturnInspection(bookingId: string, clientUtcOffsetMinutes: number, stage: InspectionStage = "return") {
  return backendRequest<ReturnInspection>(`/bookings/${encodeURIComponent(bookingId)}/${stage}-inspection`, {
    method: "POST",
    body: JSON.stringify({ client_utc_offset_minutes: clientUtcOffsetMinutes }),
  });
}

/** Validates one uploaded photo for one angle. A refusal is a 200 with `accepted: false`. */
export function submitReturnPhoto(
  inspectionId: string,
  angle: ReturnAngle,
  photoKey: string,
  clientCapturedAt: string,
  stage: InspectionStage = "return",
) {
  return backendRequest<ReturnPhotoResult>(`/${stage}-inspections/${encodeURIComponent(inspectionId)}/photos`, {
    method: "POST",
    body: JSON.stringify({ angle, photo_key: photoKey, client_captured_at: clientCapturedAt }),
  });
}

/** Freezes the four accepted photos; a return is also queued for the AI comparison. */
export function completeReturnInspection(inspectionId: string, stage: InspectionStage = "return") {
  return backendRequest<ReturnInspection>(`/${stage}-inspections/${encodeURIComponent(inspectionId)}/complete`, {
    method: "POST",
  });
}

/**
 * S3-04: the caller - renter or owner - confirms the item is back. The second
 * confirmation returns the booking. 409 with code RETURN_PHOTOS_REQUIRED
 * until the return photos are complete.
 */
export function confirmBookingReturn(bookingId: string) {
  return backendRequest<ReturnConfirmation>(`/bookings/${encodeURIComponent(bookingId)}/return-confirmation`, {
    method: "POST",
  });
}
