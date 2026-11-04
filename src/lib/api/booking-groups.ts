/**
 * Cross-owner kit checkout API client (S5-09).
 *
 * Mirrors app/routers/booking_groups.py. Shapes live in @/lib/booking-groups
 * so client components can read them; this is the server-only half.
 */

import "server-only";

import { backendRequest } from "@/lib/api/client";
import type { CreateKitRequest, Kit, KitItemRequest, KitQuote } from "@/lib/booking-groups";

export { BackendApiError as KitApiError } from "@/lib/api/client";

/** The kit priced item by item as it would be booked, grouped by owner, with the grand total. */
export function quoteKit(request: { start_date: string; end_date: string; items: KitItemRequest[] }) {
  return backendRequest<KitQuote>("/bookings/groups/quote", { method: "POST", body: JSON.stringify(request) });
}

/** Requests every item and holds the funds for each, together or not at all. */
export function createKit(request: CreateKitRequest) {
  return backendRequest<Kit>("/bookings/groups", { method: "POST", body: JSON.stringify(request) });
}

/** The signed-in renter's kits, newest first. */
export function getMyKits() {
  return backendRequest<Kit[]>("/bookings/groups/mine");
}

export function getKit(kitId: string) {
  return backendRequest<Kit>(`/bookings/groups/${encodeURIComponent(kitId)}`);
}

/** Withdraws a kit no owner has accepted any of yet, releasing its holds. */
export function withdrawKit(kitId: string) {
  return backendRequest<Kit>(`/bookings/groups/${encodeURIComponent(kitId)}/withdraw`, { method: "POST" });
}
