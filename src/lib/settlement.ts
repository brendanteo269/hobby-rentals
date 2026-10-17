import { formatDateTime, formatMoney } from "@/lib/format";

/**
 * S3-10: what happens to a returned rental's money.
 *
 * Once a rental is returned, the owner has a claim window to report damage.
 * When it passes with no dispute, the backend's settlement job pays the owner
 * the rental less the platform commission and returns the renter's deposit.
 * A reported dispute holds everything until an admin decides it. Nothing here
 * decides an amount; this only describes what the backend did or will do.
 */

export type LiableParty = "RENTER" | "OWNER";

export type RentalDispute = {
  id: string;
  booking_id: string | null;
  bundle_booking_id: string | null;
  listing_id: string;
  listing_name: string | null;
  description: string;
  claimed_cents: number;
  status: "OPEN" | "RESOLVED";
  liable_party: LiableParty | null;
  damage_cents: number | null;
  resolved_at: string | null;
  created_at: string;
};

export type RentalSettlement = {
  id: string;
  rental_subtotal_cents: number;
  commission_bps: number;
  commission_cents: number;
  owner_rental_payout_cents: number;
  overdue_fee_cents: number;
  deposit_held_cents: number;
  renter_damage_liability_cents: number;
  damage_deduction_cents: number;
  protection_payout_cents: number;
  deposit_refund_cents: number;
  owner_total_payout_cents: number;
  settled_at: string;
};

/** Set on returned rentals in the bookings lists. */
export type SettlementState = {
  returned_at: string | null;
  claim_window_ends_at: string | null;
  dispute: RentalDispute | null;
  settlement: RentalSettlement | null;
};

/** Whether the owner can still report damage: the window is open and nothing is reported or settled yet. */
export function canReportDamage(state: SettlementState | null | undefined, now: Date = new Date()): boolean {
  if (!state || state.dispute || state.settlement || !state.claim_window_ends_at) return false;
  return now < new Date(state.claim_window_ends_at);
}

/**
 * One line on where a returned rental's money stands, worded for whoever is
 * reading: the renter hears about their deposit, the owner about their payout.
 */
export function settlementLine(state: SettlementState, viewer: "renter" | "owner", now: Date = new Date()): string {
  const { settlement, dispute } = state;
  if (settlement) {
    if (viewer === "renter") {
      const back = `Settled. ${formatMoney(settlement.deposit_refund_cents)} of your deposit came back to your wallet`;
      return settlement.damage_deduction_cents > 0
        ? `${back}; ${formatMoney(settlement.damage_deduction_cents)} was deducted for damage.`
        : `${back}.`;
    }
    const extras = [
      settlement.damage_deduction_cents + settlement.protection_payout_cents > 0 &&
        `${formatMoney(settlement.damage_deduction_cents + settlement.protection_payout_cents)} for damage`,
      settlement.overdue_fee_cents > 0 && `${formatMoney(settlement.overdue_fee_cents)} in overdue fees`,
    ].filter(Boolean);
    return (
      `Settled. ${formatMoney(settlement.owner_total_payout_cents)} paid to your wallet: the rental less ` +
      `${formatMoney(settlement.commission_cents)} platform commission` +
      (extras.length > 0 ? `, plus ${extras.join(" and ")}.` : ".")
    );
  }
  if (dispute?.status === "OPEN") {
    return viewer === "renter"
      ? "The owner reported damage. Your deposit stays on hold while the platform reviews it."
      : `You reported damage (claiming ${formatMoney(dispute.claimed_cents)}). The rental's funds stay on hold until the platform decides.`;
  }
  const windowEnds = state.claim_window_ends_at;
  if (windowEnds && now < new Date(windowEnds)) {
    return viewer === "renter"
      ? `Your deposit comes back after ${formatDateTime(windowEnds)}, unless the owner reports damage before then.`
      : `You can report damage until ${formatDateTime(windowEnds)}. Your payout follows once that window closes.`;
  }
  return viewer === "renter" ? "Your deposit is being returned." : "Your payout is being processed.";
}
