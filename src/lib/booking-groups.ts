/**
 * S5-09: one checkout for a cross-owner bundle (a "kit"): the shape of the
 * priced breakdown and of a kit once it is requested.
 *
 * Mirrors app/routers/booking_groups.py. Free of `server-only` because the
 * checkout and its status views are client components. Each item of a kit is
 * an ordinary booking, so its own page, meetup, pickup, return and settlement
 * are the single-listing ones.
 */

import type { BookingStatus } from "@/lib/bookings";
import type { EditableItem } from "@/lib/cross-owner-bundles";

/** One item's price for the kit's dates. */
export type KitQuoteItem = {
  listing_id: string;
  listing_name: string;
  rental_subtotal_cents: number;
  platform_fee_cents: number;
  deposit_cents: number;
  protection_fee_cents: number;
  /** What protection would cost and cover, whether or not it was chosen. */
  protection: { available: boolean; selected: boolean; offered_fee_cents: number | null };
  total_amount_cents: number;
};

/** What one owner is owed for their items in the kit (Scenario 1). */
export type KitQuoteOwner = {
  owner_id: string;
  owner_name: string | null;
  items: KitQuoteItem[];
  rental_subtotal_cents: number;
  platform_fee_cents: number;
  deposit_cents: number;
  protection_fee_cents: number;
  total_amount_cents: number;
};

export type KitQuote = {
  start_date: string;
  end_date: string;
  rental_days: number;
  owners: KitQuoteOwner[];
  rental_subtotal_cents: number;
  platform_fee_cents: number;
  deposit_cents: number;
  protection_fee_cents: number;
  total_amount_cents: number;
};

/** One listing of the kit, and whether the renter wants damage protection on it. */
export type KitItemRequest = { listing_id: string; damage_protection: boolean };

export type CreateKitRequest = {
  start_date: string;
  end_date: string;
  items: KitItemRequest[];
  idempotency_key: string;
  /** The total the renter was shown; refused if the price has moved since. */
  expected_total_cents: number;
  activity?: string;
  group_size?: number;
  origin_lat?: number;
  origin_lng?: number;
};

export type KitStatus = "PENDING" | "CONFIRMED" | "FAILED";

export type KitItem = {
  booking_id: string;
  listing_id: string;
  listing_name: string | null;
  primary_photo_url: string | null;
  owner_id: string;
  owner_name: string | null;
  status: BookingStatus;
  payment_status: string | null;
  rental_subtotal_cents: number | null;
  platform_fee_cents: number | null;
  deposit_cents: number | null;
  protection_fee_cents: number;
  total_amount_cents: number | null;
  respond_by: string | null;
  decline_reason: string | null;
};

/** Which item brought the kit down, and how (Scenario 3). */
export type KitFailure = {
  reason: "DECLINED" | "EXPIRED" | "WITHDRAWN";
  listing_id: string | null;
  listing_name: string | null;
  owner_name: string | null;
  at: string | null;
};

/** What to build the kit again from, without what an owner turned down. */
export type KitRebuild = {
  activity: string | null;
  start_date: string;
  end_date: string;
  group_size: number | null;
  origin_lat: number | null;
  origin_lng: number | null;
  exclude_listing_ids: string[];
};

export type Kit = {
  id: string;
  status: KitStatus;
  activity: string | null;
  group_size: number | null;
  start_date: string;
  end_date: string;
  total_amount_cents: number;
  created_at: string;
  items: KitItem[];
  failure: KitFailure | null;
  rebuild: KitRebuild | null;
  /** Set only on the response to creating it. */
  replayed?: boolean;
};

export const KIT_STATUS_LABELS: Record<KitStatus, string> = {
  PENDING: "Waiting for owners",
  CONFIRMED: "Confirmed",
  FAILED: "Not going ahead",
};

/** How a kit ended, in the renter's terms, for the banner on a failed kit (Scenario 3). */
export function kitFailureMessage(failure: KitFailure): string {
  const item = failure.listing_name ?? "an item";
  const owner = failure.owner_name ? ` from ${failure.owner_name}` : "";
  switch (failure.reason) {
    case "DECLINED":
      return `${item}${owner} was declined, so the rest of your kit was cancelled and every hold has been released.`;
    case "EXPIRED":
      return `${item}${owner} was not answered in time, so the rest of your kit was cancelled and every hold has been released.`;
    case "WITHDRAWN":
      return "You withdrew this kit. Every hold has been released.";
  }
}

/** Items of the editor that are picked, as the kit's request: one per listing, protection off until chosen. */
export function kitItemsOf(items: EditableItem[], protected_: ReadonlySet<string> = new Set()): KitItemRequest[] {
  return items.flatMap((item) =>
    item.selected ? [{ listing_id: item.selected.id, damage_protection: protected_.has(item.selected.id) }] : [],
  );
}

/** How many items a priced kit has across all its owners. */
export function quotedItemCount(quote: KitQuote): number {
  return quote.owners.reduce((count, owner) => count + owner.items.length, 0);
}

/** Items still waiting on an owner, so the kit page can say how many answers are outstanding. */
export function pendingItemCount(kit: Kit): number {
  return kit.items.filter((item) => item.status === "PENDING").length;
}
