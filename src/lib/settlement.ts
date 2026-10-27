import type { ConditionScan, DamageType, Severity } from "@/lib/condition-scans";
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
  /** S3-06 claims only: the AI scan it rests on. Null on an S3-10 report. */
  condition_scan_id?: string | null;
  /** S3-08: the renter's rebuttal, once they have disputed the claim. */
  rebuttal?: string | null;
  rebuttal_photo_keys?: string[];
  /** When the case was escalated to arbitration. Null until the renter disputes. */
  rebutted_at?: string | null;
  /** S3-06 claims only: when the renter's time to accept or dispute runs out. */
  respond_by?: string | null;
};

/** S3-06: a claim as either party reads it, with what it rests on. */
export type DamageClaim = RentalDispute & {
  owner_name: string | null;
  renter_name: string | null;
  /** The deposit the claim holds. */
  deposit_cents: number | null;
  start_date: string | null;
  end_date: string | null;
  evidence_photo_urls: string[];
  scan: ConditionScan | null;
  /** S4-08: the AI repair-cost estimate as the owner saw it when claiming. */
  ai_estimate: RepairEstimate | null;
  /** S4-08: the repair quote or receipt backing a claim well above the estimate. */
  repair_quote_urls: string[];
};

/** S4-08: a price found on the web - a repair quote or a second-hand listing. */
export type PriceSource = { title: string; url: string; site: string; price_cents: number };

export type EstimateItem = {
  angle: string;
  number: number;
  damage_type: DamageType;
  severity: Severity | null;
  summary: string;
  /** Wear and tear: costs nothing, shown as not claimable. */
  is_wear: boolean;
  cost_cents: number;
  low_cents: number;
  high_cents: number;
  sources: PriceSource[];
  /** False when the cost is the AI's own range because the web had no prices. */
  from_web: boolean;
  /** The repair the AI assumed when it guessed the cost. */
  work?: string | null;
};

/** S4-08: what the AI reckons the damage costs to put right, and what the item is worth. */
export type RepairEstimate = {
  item: string;
  total_cents: number;
  low_cents: number;
  high_cents: number;
  items: EstimateItem[];
  condition: string;
  condition_note: string | null;
  replacement_value_cents: number | null;
  cap_note: string | null;
  market_value_cents: number | null;
  comparables: PriceSource[];
  /** Repair would cost more than a used replacement. */
  uneconomical: boolean;
  web_prices_found: boolean;
  /** Claiming above this needs a repair quote or receipt. */
  quote_required_above_cents: number;
  created_at: string;
};

/**
 * S3-06 "claim pending renter": an open claim still inside the renter's
 * response window. Answering it is S3-07 (accept) and S3-08 (dispute).
 */
export function claimPendingRenter(dispute: RentalDispute | null | undefined, now: Date = new Date()): boolean {
  return Boolean(
    dispute &&
      dispute.status === "OPEN" &&
      // S3-08: a disputed claim is still OPEN - that is what keeps the deposit
      // frozen - so the window alone no longer means it is the renter's move.
      !dispute.rebutted_at &&
      dispute.respond_by &&
      now < new Date(dispute.respond_by),
  );
}

/**
 * S3-08: the renter rejected the claim and an arbitrator has it. Still OPEN,
 * deliberately: the deposit stays frozen until S3-09 decides.
 */
export function claimUnderArbitration(dispute: RentalDispute | null | undefined): boolean {
  return Boolean(dispute && dispute.status === "OPEN" && dispute.rebutted_at);
}

/** Whole seconds from now until an ISO time (negative once it has passed), for a countdown's starting figure. */
export function secondsUntil(iso: string, now: Date = new Date()): number {
  return Math.floor((new Date(iso).getTime() - now.getTime()) / 1000);
}

/** The renter's view of a claim on their booking - the notification's link too. */
export function renterClaimPath(bookingId: string): `/bookings/${string}/claim` {
  return `/bookings/${bookingId}/claim`;
}

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
      // Never "S$0.00 came back": say where the deposit went instead.
      if (settlement.deposit_refund_cents === 0) {
        return settlement.damage_deduction_cents > 0
          ? `Settled. Your whole ${formatMoney(settlement.damage_deduction_cents)} deposit was deducted for damage.`
          : "Settled. No deposit was held for this rental.";
      }
      const back = `Settled. ${formatMoney(settlement.deposit_refund_cents)} of your deposit came back to your wallet`;
      return settlement.damage_deduction_cents > 0
        ? `${back}; ${formatMoney(settlement.damage_deduction_cents)} was deducted for damage.`
        : `${back}.`;
    }
    // A booking from before wallet holds is settled with nothing to move.
    if (settlement.owner_total_payout_cents === 0 && settlement.rental_subtotal_cents === 0) {
      return "Settled. Nothing was held for this rental, so there was nothing to pay out.";
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
  if (dispute && claimPendingRenter(dispute, now)) {
    return viewer === "renter"
      ? `Claim pending: the owner claims ${formatMoney(dispute.claimed_cents)} for damage. Review it and respond by ${formatDateTime(dispute.respond_by!)}. Your deposit stays on hold.`
      : `Claim pending renter: you claimed ${formatMoney(dispute.claimed_cents)}. They have until ${formatDateTime(dispute.respond_by!)} to respond; the rental's funds stay on hold.`;
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


/**
 * S3-07: what accepting a damage claim moved.
 *
 * `unrecovered_cents` is Scenario 3 - the part of the claim the held deposit
 * could not cover, which the owner does not get.
 */
export type ClaimSettlement = {
  deducted_cents: number;
  deposit_refund_cents: number;
  unrecovered_cents: number;
  owner_payout_cents: number;
};
