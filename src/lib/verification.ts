/**
 * S4-01: the Verified Owner badge.
 *
 * About the person listing an item - not the "Serial verified" badge on the
 * same cards, which is about the item's passport, and not the "Verified
 * account" badge on the profile, which is about a confirmed email address.
 */
export type OwnerVerification = {
  verified: boolean;
  completed_rentals: number;
  answered_requests: number;
  missed_requests: number;
  response_rate_bps: number;
};

/** The response rate as a whole percent, floored - 9523 bps reads as 95%. */
export function responseRatePercent(verification: Pick<OwnerVerification, "response_rate_bps">): number {
  return Math.floor(verification.response_rate_bps / 100);
}

/**
 * Whether this owner has ever been asked to answer a booking request.
 *
 * With none, the rate is a vacuous 100% - nothing was asked, so nothing was
 * missed. Shown as a percentage it would claim a perfect record the owner has
 * not earned, so callers say "no requests yet" instead.
 */
export function hasAnsweredRequests(
  verification: Pick<OwnerVerification, "answered_requests" | "missed_requests">,
): boolean {
  return verification.answered_requests + verification.missed_requests > 0;
}
