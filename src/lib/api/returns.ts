import "server-only";

import { backendRequest } from "@/lib/api/client";
import type { ReturnAngle, ReturnInspection, ReturnPhotoResult } from "@/lib/returns";

/** Mirrors the FastAPI routes in app/routers/returns.py. */

/** The booking's return inspection - completed, or the one in progress. 404 if none has been started. */
export function getReturnInspection(bookingId: string) {
  return backendRequest<ReturnInspection>(`/bookings/${encodeURIComponent(bookingId)}/return-inspection`);
}

/** Opens the capture session on an active booking, or resumes the open one. */
export function startReturnInspection(bookingId: string, clientUtcOffsetMinutes: number) {
  return backendRequest<ReturnInspection>(`/bookings/${encodeURIComponent(bookingId)}/return-inspection`, {
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
) {
  return backendRequest<ReturnPhotoResult>(`/return-inspections/${encodeURIComponent(inspectionId)}/photos`, {
    method: "POST",
    body: JSON.stringify({ angle, photo_key: photoKey, client_captured_at: clientCapturedAt }),
  });
}

/** Freezes the four accepted photos and queues them for the AI comparison. */
export function completeReturnInspection(inspectionId: string) {
  return backendRequest<ReturnInspection>(`/return-inspections/${encodeURIComponent(inspectionId)}/complete`, {
    method: "POST",
  });
}
