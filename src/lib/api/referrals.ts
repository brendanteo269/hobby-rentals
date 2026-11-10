import "server-only";

import { backendRequest } from "@/lib/api/client";
import type { ReferralSummary } from "@/lib/referrals";

/** Mirrors the FastAPI route in app/routers/referrals.py (S6-07). */

/** The signed-in member's referral code and how their friends have done, as counts. */
export function getMyReferrals() {
  return backendRequest<ReferralSummary>("/referrals/me");
}
