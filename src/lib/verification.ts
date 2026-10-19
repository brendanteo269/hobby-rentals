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
