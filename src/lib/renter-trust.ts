/**
 * S4-06: the Trusted Renter badge.
 *
 * About the person asking to rent - the mirror of the Verified Owner badge in
 * @/lib/verification, which is about the person listing. A member is usually
 * both, and the two say different things, so neither stands in for the other.
 */
export type RenterTrust = {
  trusted: boolean;
  completed_rentals: number;
  on_time_returns: number;
  late_returns: number;
  on_time_rate_bps: number;
  upheld_claims: number;
};

/** The on-time rate as a whole percent, floored - 9523 bps reads as 95%. */
export function onTimeRatePercent(trust: Pick<RenterTrust, "on_time_rate_bps">): number {
  return Math.floor(trust.on_time_rate_bps / 100);
}

/**
 * Whether this renter has returned anything yet.
 *
 * With nothing completed the rate is a vacuous 100% - nothing was returned,
 * so nothing was returned late. Shown as a percentage it would claim a record
 * they have not earned, so callers say "no rentals yet" instead.
 */
export function hasCompletedRentals(trust: Pick<RenterTrust, "completed_rentals">): boolean {
  return trust.completed_rentals > 0;
}
