import { describe, expect, it } from "vitest";
import { formatDateTime, formatMoney } from "@/lib/format";
import {
  canReportDamage,
  claimPendingRenter,
  renterClaimPath,
  secondsUntil,
  settlementLine,
  type RentalDispute,
  type RentalSettlement,
  type SettlementState,
} from "@/lib/settlement";

const NOW = new Date("2026-10-17T12:00:00Z");
const WINDOW_ENDS = "2026-10-18T09:00:00+00:00";

const settlement: RentalSettlement = {
  id: "s1",
  rental_subtotal_cents: 2000,
  commission_bps: 1000,
  commission_cents: 200,
  owner_rental_payout_cents: 1800,
  overdue_fee_cents: 0,
  deposit_held_cents: 2500,
  renter_damage_liability_cents: 0,
  damage_deduction_cents: 0,
  protection_payout_cents: 0,
  deposit_refund_cents: 2500,
  owner_total_payout_cents: 1800,
  settled_at: "2026-10-18T10:00:00+00:00",
};

const dispute: RentalDispute = {
  id: "d1",
  booking_id: "b1",
  bundle_booking_id: null,
  listing_id: "l1",
  listing_name: "Camera",
  description: "Cracked lens",
  claimed_cents: 4000,
  status: "OPEN",
  liable_party: null,
  damage_cents: null,
  resolved_at: null,
  created_at: "2026-10-17T10:00:00+00:00",
};

const returned: SettlementState = {
  returned_at: "2026-10-17T09:00:00+00:00",
  claim_window_ends_at: WINDOW_ENDS,
  dispute: null,
  settlement: null,
};

describe("canReportDamage", () => {
  it("is open inside the claim window with nothing reported or settled", () => {
    expect(canReportDamage(returned, NOW)).toBe(true);
  });

  it("closes when the window passes, a dispute exists or the rental is settled", () => {
    expect(canReportDamage(returned, new Date("2026-10-19T00:00:00Z"))).toBe(false);
    expect(canReportDamage({ ...returned, dispute }, NOW)).toBe(false);
    expect(canReportDamage({ ...returned, settlement }, NOW)).toBe(false);
    expect(canReportDamage(null, NOW)).toBe(false);
  });
});

describe("settlementLine", () => {
  it("tells each side where the money went once settled", () => {
    expect(settlementLine({ ...returned, settlement }, "renter", NOW)).toBe(
      `Settled. ${formatMoney(2500)} of your deposit came back to your wallet.`,
    );
    expect(settlementLine({ ...returned, settlement }, "owner", NOW)).toBe(
      `Settled. ${formatMoney(1800)} paid to your wallet: the rental less ${formatMoney(200)} platform commission.`,
    );
  });

  it("names a damage deduction to both sides", () => {
    const deducted = {
      ...settlement,
      damage_deduction_cents: 1500,
      deposit_refund_cents: 1000,
      owner_total_payout_cents: 3300,
    };
    expect(settlementLine({ ...returned, settlement: deducted }, "renter", NOW)).toBe(
      `Settled. ${formatMoney(1000)} of your deposit came back to your wallet; ${formatMoney(1500)} was deducted for damage.`,
    );
    expect(settlementLine({ ...returned, settlement: deducted }, "owner", NOW)).toContain(
      `plus ${formatMoney(1500)} for damage.`,
    );
  });

  it("never tells the renter $0.00 came back", () => {
    const wholly = { ...settlement, damage_deduction_cents: 2500, deposit_refund_cents: 0 };
    expect(settlementLine({ ...returned, settlement: wholly }, "renter", NOW)).toBe(
      `Settled. Your whole ${formatMoney(2500)} deposit was deducted for damage.`,
    );
    const noDeposit = { ...settlement, deposit_held_cents: 0, deposit_refund_cents: 0 };
    expect(settlementLine({ ...returned, settlement: noDeposit }, "renter", NOW)).toBe(
      "Settled. No deposit was held for this rental.",
    );
  });

  it("says a rental with nothing held had nothing to pay out", () => {
    const empty = {
      ...settlement,
      rental_subtotal_cents: 0,
      commission_cents: 0,
      owner_rental_payout_cents: 0,
      deposit_held_cents: 0,
      deposit_refund_cents: 0,
      owner_total_payout_cents: 0,
    };
    expect(settlementLine({ ...returned, settlement: empty }, "owner", NOW)).toBe(
      "Settled. Nothing was held for this rental, so there was nothing to pay out.",
    );
  });

  it("says funds are on hold while a dispute is open", () => {
    expect(settlementLine({ ...returned, dispute }, "renter", NOW)).toContain("deposit stays on hold");
    expect(settlementLine({ ...returned, dispute }, "owner", NOW)).toContain(`claiming ${formatMoney(4000)}`);
  });

  it("names the end of the claim window before settlement", () => {
    expect(settlementLine(returned, "owner", NOW)).toBe(
      `You can report damage until ${formatDateTime(WINDOW_ENDS)}. Your payout follows once that window closes.`,
    );
    expect(settlementLine(returned, "renter", NOW)).toContain(formatDateTime(WINDOW_ENDS));
  });

  it("says it is in progress once the window has passed", () => {
    expect(settlementLine(returned, "owner", new Date("2026-10-19T00:00:00Z"))).toBe("Your payout is being processed.");
  });
});


describe("S3-06 claims", () => {
  const RESPOND_BY = "2026-10-19T12:00:00+00:00";
  const claim: RentalDispute = { ...dispute, respond_by: RESPOND_BY, condition_scan_id: "s1" };

  it("is pending the renter while open and inside the response window", () => {
    expect(claimPendingRenter(claim, NOW)).toBe(true);
    expect(claimPendingRenter(claim, new Date("2026-10-19T12:00:01Z"))).toBe(false);
    expect(claimPendingRenter({ ...claim, status: "RESOLVED" }, NOW)).toBe(false);
    // An S3-10 report has no response window: it goes straight to the platform.
    expect(claimPendingRenter(dispute, NOW)).toBe(false);
    expect(claimPendingRenter(null, NOW)).toBe(false);
  });

  it("tells each side the claim is pending the renter, and until when", () => {
    const state = { ...returned, dispute: claim };
    expect(settlementLine(state, "renter", NOW)).toContain(`respond by ${formatDateTime(RESPOND_BY)}`);
    expect(settlementLine(state, "renter", NOW)).toContain(formatMoney(claim.claimed_cents));
    expect(settlementLine(state, "owner", NOW)).toMatch(/^Claim pending renter/);
  });

  it("counts down to a time and builds the renter's claim path", () => {
    expect(secondsUntil("2026-10-17T12:01:00Z", NOW)).toBe(60);
    expect(secondsUntil("2026-10-17T11:59:00Z", NOW)).toBe(-60);
    expect(renterClaimPath("b1")).toBe("/bookings/b1/claim");
  });
});
