import { describe, expect, it } from "vitest";
import { formatDateTime, formatMoney } from "@/lib/format";
import { canReportDamage, settlementLine, type RentalDispute, type RentalSettlement, type SettlementState } from "@/lib/settlement";

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
