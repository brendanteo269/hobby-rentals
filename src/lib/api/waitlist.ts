/**
 * Waitlist API client for the frontend (S2-15).
 *
 * Mirrors the FastAPI routes in app/routers/waitlist.py. Shapes and labels
 * live in @/lib/waitlist so client components can read them too; this module
 * is the server-only half that actually talks to the backend.
 */

import "server-only";

import { backendRequest } from "@/lib/api/client";
import type { WaitlistEntry } from "@/lib/waitlist";

export { BackendApiError as WaitlistApiError } from "@/lib/api/client";

/**
 * Queues the caller for dates another renter currently holds. The API refuses
 * dates that are not actually booked - there would be nothing to wait for.
 */
export function joinWaitlist(listingId: string, start_date: string, end_date: string) {
  return backendRequest<WaitlistEntry>(`/listings/${encodeURIComponent(listingId)}/waitlist`, {
    method: "POST",
    body: JSON.stringify({ start_date, end_date }),
  });
}

/** Leaves the queue. Nothing was held, so nothing is released. */
export function leaveWaitlist(entryId: string) {
  return backendRequest<WaitlistEntry>(`/waitlist/${encodeURIComponent(entryId)}`, {
    method: "DELETE",
  });
}

/** The caller's own queue places, newest first. */
export function getMyWaitlist(openOnly = false) {
  return backendRequest<WaitlistEntry[]>(`/waitlist/mine${openOnly ? "?open_only=true" : ""}`);
}

/** Who is waiting on one of the caller's own listings, in queue order. Owner-only. */
export function getListingWaitlist(listingId: string) {
  return backendRequest<WaitlistEntry[]>(`/listings/${encodeURIComponent(listingId)}/waitlist`);
}

/** The caller's open place overlapping these dates, if any. */
export function getMyWaitlistForDates(listingId: string, startDate: string, endDate: string) {
  const query = new URLSearchParams({ start_date: startDate, end_date: endDate });
  return backendRequest<{ entry: WaitlistEntry | null }>(
    `/listings/${encodeURIComponent(listingId)}/waitlist/mine?${query}`,
  );
}
