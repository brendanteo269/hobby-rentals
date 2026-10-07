import { describe, expect, it } from "vitest";
import { cancellationLines, hasTerms, type CancellationTerms } from "@/lib/cancellations";

const partial: CancellationTerms = {
  policy_version: "v1",
  tier: "PARTIAL",
  tier_label: "Cancelled 2 to 7 days before the start",
  refund_bps: 5000,
  hours_before_start: 101.5,
  rental_hold_cents: 2101,
  refund_cents: 1050,
  non_refundable_cents: 1051,
  deposit_release_cents: 2500,
  total_back_to_wallet_cents: 3550,
};

describe("cancellationLines", () => {
  it("shows the split, the deposit and the total", () => {
    expect(cancellationLines(partial)).toEqual([
      { label: "Rental and platform fee held", cents: 2101 },
      { label: "Refunded (50%)", cents: 1050 },
      { label: "Not refundable", cents: 1051, tone: "loss" },
      { label: "Security deposit released", cents: 2500 },
      { label: "Back to your wallet", cents: 3550, tone: "total" },
    ]);
  });

  it("leaves out empty lines but always states the total", () => {
    const late = { ...partial, tier: "LATE" as const, refund_bps: 0, refund_cents: 0, non_refundable_cents: 2101, deposit_release_cents: 0, total_back_to_wallet_cents: 0 };

    expect(cancellationLines(late).map((line) => line.label)).toEqual([
      "Rental and platform fee held",
      "Not refundable",
      "Back to your wallet",
    ]);
  });
});

describe("hasTerms", () => {
  it("is false for a booking that cannot be cancelled", () => {
    expect(hasTerms({ booking_id: "b", bundle_booking_id: null, cancellable: false, reason: "BOOKING_ACTIVE", message: "Return it." })).toBe(false);
  });

  it("is true for a cancellable preview with amounts", () => {
    expect(hasTerms({ booking_id: "b", bundle_booking_id: null, cancellable: true, reason: null, message: null, ...partial })).toBe(true);
  });
});
