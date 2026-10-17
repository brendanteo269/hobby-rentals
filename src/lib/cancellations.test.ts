import { describe, expect, it } from "vitest";
import {
  cancellationLines,
  cancellationOutcomeLine,
  hasTerms,
  type CancellationOutcome,
  type CancellationTerms,
} from "@/lib/cancellations";
import { formatMoney } from "@/lib/format";

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

describe("cancellationOutcomeLine", () => {
  const byRenter: CancellationOutcome = {
    cancelled_by: "RENTER",
    cancelled_at: "2026-10-17T10:00:00Z",
    released_to_wallet_cents: 3550,
    refund_cents: 1050,
    non_refundable_cents: 1051,
    deposit_released_cents: 2500,
    protection_released_cents: 0,
    tier_label: "Cancelled 2 to 7 days before the start",
  };
  const byOwner: CancellationOutcome = {
    ...byRenter,
    cancelled_by: "OWNER",
    released_to_wallet_cents: 4600,
    refund_cents: null,
    non_refundable_cents: null,
    deposit_released_cents: null,
    protection_released_cents: null,
    tier_label: null,
  };

  it("tells the renter what came back and what the policy kept", () => {
    expect(cancellationOutcomeLine(byRenter, "renter")).toBe(
      `You cancelled. ${formatMoney(3550)} came back to your wallet; ${formatMoney(1051)} was not refundable under the policy.`,
    );
  });

  it("tells the owner what a renter's cancellation paid them", () => {
    expect(cancellationOutcomeLine(byRenter, "owner")).toBe(
      `The renter cancelled. ${formatMoney(1051)} was paid to you under the cancellation policy.`,
    );
    expect(cancellationOutcomeLine({ ...byRenter, non_refundable_cents: 0 }, "owner")).toBe(
      "The renter cancelled. Nothing was payable to you under the cancellation policy.",
    );
  });

  it("reports an owner's cancellation as a full release to both sides", () => {
    expect(cancellationOutcomeLine(byOwner, "renter")).toBe(`The owner cancelled. Your hold of ${formatMoney(4600)} was released in full.`);
    expect(cancellationOutcomeLine(byOwner, "owner")).toBe(`You cancelled. The renter's hold of ${formatMoney(4600)} was released in full.`);
  });

  it("names the platform when nobody on the booking cancelled it", () => {
    expect(cancellationOutcomeLine({ ...byOwner, cancelled_by: "SYSTEM", released_to_wallet_cents: 0 }, "renter")).toBe(
      "The platform cancelled. Nothing was held, so nothing needed releasing.",
    );
  });
});
