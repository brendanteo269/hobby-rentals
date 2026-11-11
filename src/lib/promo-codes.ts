/**
 * S5-12: an owner's discount codes for one listing.
 *
 * Mirrors the routes in app/routers/listings.py. A renter never reads these:
 * a code is something they are given, and they learn whether it works by
 * applying it at the booking form.
 */
export type PromoDiscountType = "PERCENT" | "FIXED";

export type PromoCode = {
  id: string;
  listing_id: string;
  code: string;
  discount_type: PromoDiscountType;
  percent_off: number | null;
  amount_off_cents: number | null;
  starts_on: string;
  ends_on: string;
  usage_limit: number | null;
  /** How many bookings have used it, so an owner can see a code working. */
  times_used: number;
  created_at: string;
};

/** "10% off" or "S$15.00 off", from whichever half the code carries. */
export function promoDiscountLabel(code: Pick<PromoCode, "discount_type" | "percent_off" | "amount_off_cents">): string {
  if (code.discount_type === "PERCENT") return `${code.percent_off}% off`;
  return `S$${((code.amount_off_cents ?? 0) / 100).toFixed(2)} off`;
}

/**
 * What is left of a usage limit, or null when there is none.
 *
 * Zero is a real answer and reads differently from "unlimited", so the two
 * are not collapsed into a falsy check by callers.
 */
export function promoUsesLeft(code: Pick<PromoCode, "usage_limit" | "times_used">): number | null {
  return code.usage_limit === null ? null : Math.max(code.usage_limit - code.times_used, 0);
}

/**
 * Where a code stands today, for the owner looking at their own listing.
 *
 * The board shows every live code, which includes ones that have not opened
 * yet and ones that are over - an owner needs to see those to know why a
 * renter said their code did not work. Each state is a separate answer
 * rather than a boolean, because what to do about each one differs.
 */
export type PromoCodeState = "SCHEDULED" | "RUNNING" | "EXPIRED" | "USED_UP";

export function promoCodeState(
  code: Pick<PromoCode, "starts_on" | "ends_on" | "usage_limit" | "times_used">,
  today: string,
): PromoCodeState {
  // Checked before the dates: a code inside its window that nobody can use
  // any more is "used up", which is the more useful thing to be told.
  if (promoUsesLeft(code) === 0) return "USED_UP";
  if (today < code.starts_on) return "SCHEDULED";
  if (today > code.ends_on) return "EXPIRED";
  return "RUNNING";
}

export const PROMO_CODE_STATE_LABELS: Record<PromoCodeState, string> = {
  SCHEDULED: "Not started",
  RUNNING: "Running",
  EXPIRED: "Expired",
  USED_UP: "Fully claimed",
};
