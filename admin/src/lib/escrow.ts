import { createAdminClient } from "@/lib/supabase/admin";
import type { StatusTone } from "@/lib/users";

/** Ledger row types that belong to a rental's escrow story: the hold, its release, and what settlement (S3-10) or a cancellation did with it. */
export const ESCROW_LEDGER_TYPES = [
  "ESCROW_HOLD",
  "ESCROW_RELEASE",
  "RENTAL_CHARGE",
  "RENTAL_PAYOUT",
  "DAMAGE_DEDUCTION",
  "DAMAGE_PAYOUT",
  "OVERDUE_SETTLEMENT",
  "CANCELLATION_FEE",
  "CANCELLATION_PAYOUT",
] as const;

export const ESCROW_TYPE_LABELS: Record<string, string> = {
  ESCROW_HOLD: "Hold placed",
  ESCROW_RELEASE: "Released",
  RENTAL_CHARGE: "Rental charged",
  RENTAL_PAYOUT: "Paid to owner",
  DAMAGE_DEDUCTION: "Deducted for damage",
  DAMAGE_PAYOUT: "Damage paid to owner",
  OVERDUE_SETTLEMENT: "Overdue fee",
  CANCELLATION_FEE: "Cancellation fee",
  CANCELLATION_PAYOUT: "Cancellation paid to owner",
};

/** The escrow_component values a hold can carry, in the order they are shown. */
export const ESCROW_COMPONENTS = ["RENTAL", "DEPOSIT", "PROTECTION"] as const;
export type EscrowComponent = (typeof ESCROW_COMPONENTS)[number];

/**
 * A bundle booking (and a booking from before holds were split) holds one
 * lump sum with no escrow_component, so that hold is shown as a single
 * "WHOLE" part rather than as fee and deposit.
 */
export type EscrowPart = EscrowComponent | "WHOLE";

export const ESCROW_COMPONENT_LABELS: Record<EscrowPart, string> = {
  RENTAL: "Rental fee",
  DEPOSIT: "Security deposit",
  PROTECTION: "Damage protection",
  WHOLE: "Whole hold",
};

/** Overall hold state computed by the admin_escrow_records view. */
export type HoldState = "HELD" | "SETTLED" | "RELEASED" | "NONE";

export const HOLD_STATE_LABELS: Record<HoldState, string> = {
  HELD: "Held in escrow",
  SETTLED: "Settled",
  RELEASED: "Released",
  NONE: "No hold",
};

export const HOLD_STATE_TONE: Record<HoldState, StatusTone> = {
  HELD: "positive",
  SETTLED: "neutral",
  RELEASED: "neutral",
  NONE: "neutral",
};

/** Falls back to the raw slug so an unrecognised state never renders blank. */
export function holdStateLabel(state: string): string {
  return HOLD_STATE_LABELS[state as HoldState] ?? state;
}

export function holdStateTone(state: string): StatusTone {
  return HOLD_STATE_TONE[state as HoldState] ?? "neutral";
}

/** One escrow record from admin_get_escrow_hold: a rental with its hold amounts, state and settlement-blocking claim. */
export type AdminEscrowSummary = {
  /** BUNDLE records are keyed by a bundle booking id, not a booking id. */
  subject_type: "BOOKING" | "BUNDLE";
  id: string;
  subject_name: string;
  renter_id: string;
  renter_display_name: string | null;
  renter_email: string | null;
  owner_id: string;
  owner_display_name: string | null;
  owner_email: string | null;
  status: string;
  start_date: string;
  end_date: string;
  created_at: string;
  rental_hold_cents: number;
  deposit_hold_cents: number;
  protection_hold_cents: number;
  hold_state: string;
  settlement_blocked: boolean;
};

/** One wallet_transactions row tied to a rental's escrow. */
export type EscrowLedgerRow = {
  id: string;
  user_id: string;
  type: string;
  escrow_component: string | null;
  amount_cents: number;
  status: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

/** Everything admin_get_escrow_hold returns (the admin_escrow_records view), plus the ledger it was folded from. */
export type AdminEscrowDetail = AdminEscrowSummary & {
  dispute_id: string | null;
  dispute_status: string | null;
  dispute_claimed_cents: number | null;
  dispute_description: string | null;
  dispute_opened_at: string | null;
  settlement_id: string | null;
  settled_at: string | null;
  settlement_owner_payout_cents: number | null;
  settlement_deposit_refund_cents: number | null;
  settlement_damage_deduction_cents: number | null;
  ledger: EscrowLedgerRow[];
};

/** One escrow record by id (a booking or bundle booking id), or null when none exists. */
export async function getEscrowRecordById(id: string): Promise<AdminEscrowDetail | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("admin_get_escrow_hold", { target_id: id });

  if (error) {
    console.error("Escrow lookup failed:", error.message);
    return null;
  }

  const record = ((data ?? []) as Omit<AdminEscrowDetail, "ledger">[])[0];
  if (!record) return null;

  // wallet_transactions grants select to service_role directly (see
  // getBookingById), so the ledger is a plain query. Bundle holds carry
  // bundle_booking_id with booking_id null, which is why both columns are
  // matched; `id` comes from the RPC row above, never from the URL, so it is
  // safe to interpolate into the filter.
  const { data: ledger, error: ledgerError } = await supabase
    .from("wallet_transactions")
    .select("id, user_id, type, escrow_component, amount_cents, status, description, created_at, updated_at")
    .or(`booking_id.eq.${record.id},bundle_booking_id.eq.${record.id}`)
    .in("type", [...ESCROW_LEDGER_TYPES])
    .order("created_at", { ascending: true });

  if (ledgerError) console.error("Escrow ledger failed:", ledgerError.message);

  return { ...record, ledger: (ledger ?? []) as EscrowLedgerRow[] };
}

/** How one escrow component (rental fee, deposit, protection) stands, folded from its ledger rows. */
export type EscrowComponentSummary = {
  component: EscrowPart;
  amount_cents: number;
  state: "HELD" | "RELEASED" | "SETTLED";
  held_at: string;
  /** When the hold stopped being live - its row's last update - or null while it is still held. */
  closed_at: string | null;
  /** Every ledger row for this component, hold included, oldest first. */
  entries: EscrowLedgerRow[];
};

/**
 * Splits the ledger into one lifecycle per escrow component so the fee and the
 * deposit are read apart. Components that never had a hold are omitted; ledger
 * rows without a component (e.g. an owner payout) are left to the full ledger.
 * A single component-less hold (a bundle's, or a pre-split booking's) becomes one WHOLE part.
 *
 * The hold row's own status carries the lifecycle: COMPLETED is live,
 * REFUNDED was released, SETTLED was consumed by settlement.
 */
export function summariseEscrowComponents(ledger: EscrowLedgerRow[]): EscrowComponentSummary[] {
  const parts: [EscrowPart, (row: EscrowLedgerRow) => boolean][] = [
    ...ESCROW_COMPONENTS.map((component): [EscrowPart, (row: EscrowLedgerRow) => boolean] => [
      component,
      (row) => row.escrow_component === component,
    ]),
    ["WHOLE", (row) => row.escrow_component === null],
  ];

  return parts.flatMap(([component, belongs]) => {
    const entries = ledger.filter(belongs);
    const hold = entries.find((row) => row.type === "ESCROW_HOLD");
    if (!hold) return [];

    const state = hold.status === "SETTLED" ? "SETTLED" : hold.status === "REFUNDED" ? "RELEASED" : "HELD";
    return [
      {
        component,
        amount_cents: Math.abs(hold.amount_cents),
        state,
        held_at: hold.created_at,
        closed_at: state === "HELD" ? null : hold.updated_at,
        entries,
      },
    ];
  });
}
