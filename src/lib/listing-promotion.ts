/** GET /listing-promotions/quote/{id}: advisory - the purchase re-checks everything under a lock. */
export type ListingPromotionQuote = {
  eligible: boolean;
  reason: string | null;
  fee_cents: number;
  term_days: number;
  terms_version: string;
  /** End of the running promotion; null when there is none. */
  promoted_until: string | null;
  wallet_available_cents: number | null;
  wallet_shortfall_cents: number | null;
};
