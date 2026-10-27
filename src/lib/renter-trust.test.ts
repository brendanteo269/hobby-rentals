import { describe, expect, it } from "vitest";
import { hasCompletedRentals, onTimeRatePercent, type RenterTrust } from "@/lib/renter-trust";

function trust(overrides: Partial<RenterTrust> = {}): RenterTrust {
  return {
    trusted: true,
    completed_rentals: 20,
    on_time_returns: 19,
    late_returns: 1,
    on_time_rate_bps: 9500,
    upheld_claims: 0,
    ...overrides,
  };
}

describe("onTimeRatePercent", () => {
  it("floors rather than rounds, so a rate under the bar never reads as the bar", () => {
    // 19 of 20 is 9500 and qualifies; 18 of 19 is 9473 and does not. Rounded,
    // both would show "95%" and the badge would look arbitrary.
    expect(onTimeRatePercent(trust({ on_time_rate_bps: 9500 }))).toBe(95);
    expect(onTimeRatePercent(trust({ on_time_rate_bps: 9473 }))).toBe(94);
  });

  it("reads a perfect record as 100", () => {
    expect(onTimeRatePercent(trust({ on_time_rate_bps: 10_000 }))).toBe(100);
  });
});

describe("hasCompletedRentals", () => {
  it("is false for a renter who has never returned anything", () => {
    // Their rate is a vacuous 100%: nothing returned, so nothing returned
    // late. Shown as a percentage it would claim a record they lack.
    expect(hasCompletedRentals(trust({ completed_rentals: 0 }))).toBe(false);
  });

  it("is true as soon as one rental is behind them", () => {
    expect(hasCompletedRentals(trust({ completed_rentals: 1 }))).toBe(true);
  });
});
