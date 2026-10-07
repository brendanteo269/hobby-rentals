import "server-only";
import { backendRequest } from "@/lib/api/client";
import type { HobbyShieldPolicy, HobbyShieldQuote } from "@/lib/owner-protection";

export function getHobbyShieldQuote(listingId: string) {
  return backendRequest<HobbyShieldQuote>(`/owner-protection/quote/${encodeURIComponent(listingId)}`);
}
export function getMyHobbyShieldPolicies() { return backendRequest<HobbyShieldPolicy[]>("/owner-protection/mine"); }
export function purchaseHobbyShield(listing_id: string, idempotency_key: string) {
  return backendRequest<{ policy: HobbyShieldPolicy; replayed: boolean }>("/owner-protection/purchase", { method: "POST", body: JSON.stringify({ listing_id, idempotency_key }) });
}
