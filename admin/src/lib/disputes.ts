import { adminApiKey, apiUrl } from "@/lib/env";

/**
 * S3-10: damage disputes owners raise on returned rentals.
 *
 * Read and decided through the API rather than Supabase: resolving one
 * settles the rental's money in the same transaction, and that belongs to the
 * backend's settlement service, not to a portal write.
 */

export type LiableParty = "RENTER" | "OWNER";

export type AdminDispute = {
  id: string;
  booking_id: string | null;
  bundle_booking_id: string | null;
  listing_id: string;
  listing_name: string | null;
  owner_id: string;
  renter_id: string;
  owner_name: string | null;
  renter_name: string | null;
  description: string;
  /**
   * S3-08: the renter's rebuttal, when they disputed rather than accepted.
   * rebutted_at being set is what marks the case as escalated - the status
   * stays OPEN so the deposit stays frozen.
   */
  rebuttal?: string | null;
  rebuttal_photo_keys?: string[];
  rebutted_at?: string | null;
  /** Signed by the API: the S3 keys are private, so a URL is the only usable form. */
  evidence_photo_urls?: string[];
  rebuttal_photo_urls?: string[];
  claimed_cents: number;
  status: "OPEN" | "RESOLVED";
  liable_party: LiableParty | null;
  damage_cents: number | null;
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
};

export type DisputeRental = {
  id: string;
  start_date: string;
  end_date: string;
  returned_at: string | null;
  rental_subtotal_cents: number | null;
  platform_fee_cents: number | null;
  deposit_cents: number | null;
  damage_protection_selected: boolean;
  damage_coverage_cap_cents: number | null;
  damage_excess_cents: number | null;
  overdue_fee_charged_cents: number;
};

export type DisputeSettlement = {
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

export type AdminDisputeDetail = AdminDispute & {
  rental: DisputeRental | null;
  settlement: DisputeSettlement | null;
};

async function apiError(response: Response, fallback: string): Promise<string> {
  // 409 (already resolved) and 404 carry a plain-English detail.
  const body = await response.json().catch(() => null);
  return typeof body?.detail === "string" ? body.detail : `${fallback}: ${response.status}`;
}

/** Disputes oldest first, so the longest wait leads. */
export async function listDisputes(
  status: "OPEN" | "RESOLVED" | null,
): Promise<{ disputes: AdminDispute[]; error: string | null }> {
  const query = status ? `?status=${status}` : "";
  const response = await fetch(`${apiUrl()}/admin/disputes${query}`, {
    headers: { "X-Admin-Key": adminApiKey() },
    cache: "no-store",
  });
  if (!response.ok) return { disputes: [], error: await apiError(response, "Could not load disputes") };
  return { disputes: await response.json(), error: null };
}

/** Null when there's no such dispute. */
export async function getDispute(id: string): Promise<AdminDisputeDetail | null> {
  const response = await fetch(`${apiUrl()}/admin/disputes/${encodeURIComponent(id)}`, {
    headers: { "X-Admin-Key": adminApiKey() },
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Dispute lookup failed: ${response.status}`);
  return response.json();
}

/** Decides the dispute; the API settles the rental and records the outcome on the item's passport. */
export async function resolveDispute(
  id: string,
  liableParty: LiableParty,
  damageCents: number,
  note: string,
): Promise<{ error: string | null }> {
  const response = await fetch(`${apiUrl()}/admin/disputes/${encodeURIComponent(id)}/resolve`, {
    method: "POST",
    headers: { "X-Admin-Key": adminApiKey(), "Content-Type": "application/json" },
    body: JSON.stringify({ liable_party: liableParty, damage_cents: damageCents, note }),
    cache: "no-store",
  });
  if (response.ok) return { error: null };
  return { error: await apiError(response, "Resolution failed") };
}

/**
 * What the renter would pay from their deposit for a damage value, by the
 * same rule the backend applies (settle_rental): with damage protection the
 * renter owes the excess plus anything above the cap and the scheme pays the
 * rest; the deposit covers what it can. A preview for the admin only - the
 * backend's figure is the one that moves money.
 */
export function previewDeduction(rental: DisputeRental, damageCents: number) {
  const deposit = Math.max(0, (rental.deposit_cents ?? 0) - rental.overdue_fee_charged_cents);
  let liability = damageCents;
  if (rental.damage_protection_selected) {
    const excess = rental.damage_excess_cents ?? 0;
    const cap = rental.damage_coverage_cap_cents ?? 0;
    liability = Math.min(damageCents, Math.min(damageCents, excess) + Math.max(damageCents - cap, 0));
  }
  const deduction = Math.min(liability, deposit);
  return {
    liability,
    deduction,
    fromProtection: damageCents - liability,
    depositRefund: deposit - deduction,
    uncovered: liability - deduction,
  };
}
