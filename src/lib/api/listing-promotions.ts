import "server-only";
import { backendRequest } from "@/lib/api/client";
import type { ListingPromotionQuote } from "@/lib/listing-promotion";

export function getListingPromotionQuote(listingId: string) {
  return backendRequest<ListingPromotionQuote>(`/listing-promotions/quote/${encodeURIComponent(listingId)}`);
}
export function purchaseListingPromotion(listing_id: string, idempotency_key: string) {
  return backendRequest<{ promotion: { id: string; ends_at: string }; replayed: boolean }>("/listing-promotions/purchase", { method: "POST", body: JSON.stringify({ listing_id, idempotency_key }) });
}
