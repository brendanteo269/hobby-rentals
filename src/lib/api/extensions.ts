import "server-only";

import { backendRequest } from "@/lib/api/client";
import type { Booking } from "@/lib/bookings";
import type { ExtensionQuote, ExtensionRequest } from "@/lib/extensions";

/** Mirrors the FastAPI routes in app/routers/extensions.py (S3-17). */

/**
 * Prices an extension and checks the extra days are free, without requesting
 * one. A POST because it does the same availability work a request does.
 */
export function getExtensionQuote(bookingId: string, additionalDays: number) {
  return backendRequest<ExtensionQuote>(`/bookings/${encodeURIComponent(bookingId)}/extension-quote`, {
    method: "POST",
    body: JSON.stringify({ additional_days: additionalDays }),
  });
}

/** Submits a priced extension request to the owner. Nothing is charged yet. */
export function requestExtension(bookingId: string, additionalDays: number) {
  return backendRequest<ExtensionRequest>(`/bookings/${encodeURIComponent(bookingId)}/extension-requests`, {
    method: "POST",
    body: JSON.stringify({ additional_days: additionalDays }),
  });
}

/** Charges the extra days, extends the hold, and moves the booking's end date. */
export function approveExtension(requestId: string) {
  return backendRequest<Booking>(`/extension-requests/${encodeURIComponent(requestId)}/approve`, {
    method: "POST",
  });
}

/** Leaves the return deadline and the hold untouched; the renter is notified. */
export function denyExtension(requestId: string) {
  return backendRequest<ExtensionRequest>(`/extension-requests/${encodeURIComponent(requestId)}/deny`, {
    method: "POST",
  });
}
