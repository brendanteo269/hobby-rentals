import { describe, expect, it } from "vitest";
import { formatDateTime, formatMoney } from "@/lib/format";
import {
  canReportDamage,
  claimPendingRenter,
  heldInEscrowLine,
  renterClaimPath,
  secondsUntil,
  settlementLine,
  settlementReceipt,
  settlementReference,
  settlementSteps,
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


describe("S3-10 settlement tracker", () => {
  const states = (state: SettlementState, now = NOW) => settlementSteps(state, now).map((step) => step.state);

  it("shows the claim window in progress after the return, with when it closes", () => {
    const steps = settlementSteps(returned, NOW);
    expect(steps.map((step) => step.state)).toEqual(["done", "current", "upcoming"]);
    expect(steps[0].detail).toBe(formatDateTime(returned.returned_at!));
    expect(steps[1].detail).toBe(`Closes ${formatDateTime(WINDOW_ENDS)}`);
  });

  it("is being processed once the window has closed with no claim", () => {
    expect(states(returned, new Date("2026-10-18T09:00:01Z"))).toEqual(["done", "done", "current"]);
  });

  it("holds the rental while a claim is open, whatever the window", () => {
    const steps = settlementSteps({ ...returned, dispute }, NOW);
    expect(steps.map((step) => step.state)).toEqual(["done", "held", "upcoming"]);
    expect(steps[1].label).toBe("Damage claim");
    expect(states({ ...returned, dispute }, new Date("2026-10-19T00:00:00Z"))).toEqual(["done", "held", "upcoming"]);
  });

  it("is done throughout once settled, with or without a claim", () => {
    expect(states({ ...returned, settlement }, NOW)).toEqual(["done", "done", "done"]);
    const resolved = { ...returned, settlement, dispute: { ...dispute, status: "RESOLVED" as const } };
    expect(states(resolved, NOW)).toEqual(["done", "done", "done"]);
    expect(settlementSteps({ ...returned, settlement }, NOW)[2].detail).toBe(formatDateTime(settlement.settled_at));
  });
});

describe("S3-10 held in escrow", () => {
  const amounts = { rental_subtotal_cents: 1000, platform_fee_cents: 100, damage_protection_fee_cents: 200, deposit_cents: 5000 };

  it("gives the renter their whole charge and deposit, and the owner the rent", () => {
    expect(heldInEscrowLine(returned, amounts, "renter")).toBe(
      `${formatMoney(1300)} rental charge and your ${formatMoney(5000)} deposit held in escrow.`,
    );
    expect(heldInEscrowLine(returned, amounts, "owner")).toBe(
      `${formatMoney(1000)} rent and the renter's ${formatMoney(5000)} deposit held in escrow.`,
    );
  });

  it("leaves out a deposit that was never taken", () => {
    expect(heldInEscrowLine(returned, { ...amounts, deposit_cents: 0 }, "owner")).toBe(`${formatMoney(1000)} rent held in escrow.`);
  });

  it("says nothing once settled, or without the amounts", () => {
    expect(heldInEscrowLine({ ...returned, settlement }, amounts, "renter")).toBeNull();
    expect(heldInEscrowLine(returned, {}, "renter")).toBeNull();
  });
});

describe("S3-10 settlement receipt", () => {
  const sum = (lines: { cents: number; total?: boolean }[]) =>
    lines.filter((line) => !line.total).reduce((total, line) => total + line.cents, 0);

  it("takes the owner from the rent, less commission, to the payout", () => {
    const lines = settlementReceipt(settlement, "owner");
    expect(lines).toEqual([
      { label: "Rent", cents: 2000 },
      { label: "Platform commission (10%)", cents: -200 },
      { label: "Paid to your wallet", cents: 1800, total: true },
    ]);
  });

  it("gives the renter their full deposit back when nothing was taken", () => {
    expect(settlementReceipt(settlement, "renter")).toEqual([
      { label: "Deposit held", cents: 2500 },
      { label: "Returned to your wallet", cents: 2500, total: true },
    ]);
  });

  it("adds up to the total with an overdue fee and damage on both sides", () => {
    const taken: RentalSettlement = {
      ...settlement,
      overdue_fee_cents: 300,
      deposit_held_cents: 2200,
      damage_deduction_cents: 700,
      protection_payout_cents: 400,
      deposit_refund_cents: 1500,
      owner_total_payout_cents: 1800 + 300 + 700 + 400,
    };
    for (const viewer of ["owner", "renter"] as const) {
      const lines = settlementReceipt(taken, viewer);
      expect(sum(lines)).toBe(lines[lines.length - 1].cents);
    }
    expect(settlementReceipt(taken, "renter").map((line) => line.label)).toEqual([
      "Deposit held",
      "Overdue fee",
      "Damage deducted",
      "Returned to your wallet",
    ]);
  });

  it("shows a fractional commission rate and nothing for a booking that moved no money", () => {
    expect(settlementReceipt({ ...settlement, commission_bps: 750, commission_cents: 150 }, "owner")[1].label).toBe(
      "Platform commission (7.5%)",
    );
    const empty = { ...settlement, rental_subtotal_cents: 0, owner_total_payout_cents: 0, deposit_refund_cents: 0 };
    expect(settlementReceipt(empty, "owner")).toEqual([]);
  });

  it("gives a settlement a short reference that does not change", () => {
    expect(settlementReference({ id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" })).toBe("#A1B2C3D4");
  });
});
