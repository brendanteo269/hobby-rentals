import "server-only";

import { backendRequest } from "@/lib/api/client";
import type { PromoCode, PromoDiscountType } from "@/lib/promo-codes";

/** Mirrors the promo code routes in app/routers/listings.py (S5-12). */

export function getListingPromoCodes(listingId: string) {
  return backendRequest<PromoCode[]>(`/listings/${encodeURIComponent(listingId)}/promo-codes`);
}

export function createListingPromoCode(listingId: string, body: {
  code: string;
  discount_type: PromoDiscountType;
  percent_off?: number | null;
  amount_off_cents?: number | null;
  starts_on: string;
  ends_on: string;
  usage_limit?: number | null;
}) {
  return backendRequest<PromoCode>(`/listings/${encodeURIComponent(listingId)}/promo-codes`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteListingPromoCode(listingId: string, codeId: string) {
  return backendRequest<void>(
    `/listings/${encodeURIComponent(listingId)}/promo-codes/${encodeURIComponent(codeId)}`,
    { method: "DELETE" },
  );
}
