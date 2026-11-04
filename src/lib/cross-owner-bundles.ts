/**
 * S5-08 cross-owner bundles: the shape of a suggestion and the edits a renter
 * may make to it.
 *
 * Not to be confused with a single-owner bundle (@/lib/bundles, S2-20), which
 * an owner creates, stores and prices as a package. A cross-owner bundle is
 * built on request from listings of different owners, is never stored, and is
 * priced as the sum of its items - so the renter's edits (Scenario 4) happen
 * here, on the client, and re-total from the prices the backend already sent.
 *
 * Mirrors app/routers/cross_owner_bundles.py. Free of `server-only` because
 * the editor that uses it is a client component.
 */

import { LOCATION_LABELS, type LocationArea } from "@/lib/listings";

/** A listing offered for the bundle, priced for the bundle's dates. */
export type CrossOwnerBundleListing = {
  id: string;
  name: string;
  category: string;
  owner_id: string;
  owner_name: string | null;
  owner_verified: boolean;
  location_area: LocationArea;
  /** Approximate: to the collection area's anchor, not the owner's address. */
  distance_km: number | null;
  primary_photo_url: string | null;
  price_per_day_cents: number | null;
  price_per_week_cents: number | null;
  rental_days: number;
  rental_subtotal_cents: number;
  deposit_cents: number;
};

/**
 * FILLED has a pick. BUSY_FOR_DATES is listed but not free for the dates
 * (Scenario 2); NOT_LISTED is not on the platform at all (Scenario 6).
 */
export type CrossOwnerBundleItemStatus = "FILLED" | "BUSY_FOR_DATES" | "NOT_LISTED";

/** One kind of gear the activity needs, with its pick and the swaps on offer. */
export type CrossOwnerBundleItem = {
  need: string;
  reason: string;
  status: CrossOwnerBundleItemStatus;
  note: string | null;
  selected: CrossOwnerBundleListing | null;
  alternatives: CrossOwnerBundleListing[];
};

export type CrossOwnerBundle = {
  activity: string;
  start_date: string;
  end_date: string;
  rental_days: number;
  items: CrossOwnerBundleItem[];
  total_rental_cents: number;
  total_deposit_cents: number;
  owner_count: number;
  pickup_count: number;
  pickups: CrossOwnerBundlePickup[];
};

export type CrossOwnerBundlePickup = {
  location_area: LocationArea;
  item_count: number;
  distance_km: number | null;
};

/** What the renter asked for. Location is optional and always both or neither. */
export type BuildCrossOwnerBundleRequest = {
  activity: string;
  start_date: string;
  end_date: string;
  group_size?: number;
  origin_lat?: number;
  origin_lng?: number;
  /** Listings never to offer: rebuilding a kit without what an owner turned down (S5-09). */
  exclude_listing_ids?: string[];
};

/** An item the renter is editing: the backend's item plus an id that stays put while it is swapped. */
export type EditableItem = CrossOwnerBundleItem & { id: string };

/** Reason shown for an item the renter added themselves. */
export const ADDED_BY_YOU = "Added by you";

/** Starts editing from what the backend suggested. `need` is unique per bundle, so it is the id. */
export function editableItems(items: CrossOwnerBundleItem[]): EditableItem[] {
  return items.map((item) => ({ ...item, id: item.need }));
}

/** Ids of every listing currently picked, so nothing can be in the bundle twice. */
export function pickedListingIds(items: EditableItem[]): Set<string> {
  return new Set(items.flatMap((item) => (item.selected ? [item.selected.id] : [])));
}

/** Takes an item out of the bundle (Scenario 4). */
export function removeItem(items: EditableItem[], itemId: string): EditableItem[] {
  return items.filter((item) => item.id !== itemId);
}

/**
 * Swaps an item's pick for one of its alternatives. The old pick becomes an
 * alternative, so the swap can be undone and the number on offer stays the same.
 */
export function swapItem(items: EditableItem[], itemId: string, listingId: string): EditableItem[] {
  return items.map((item) => {
    const replacement = item.alternatives.find((listing) => listing.id === listingId);
    if (item.id !== itemId || !item.selected || !replacement) return item;
    return {
      ...item,
      selected: replacement,
      alternatives: item.alternatives.map((listing) => (listing.id === listingId ? item.selected! : listing)),
    };
  });
}

/** Adds a listing the renter found themselves, unless it is already in the bundle. */
export function addListing(items: EditableItem[], listing: CrossOwnerBundleListing): EditableItem[] {
  if (pickedListingIds(items).has(listing.id)) return items;
  const added: EditableItem = {
    id: `added:${listing.id}`,
    need: listing.name,
    reason: ADDED_BY_YOU,
    status: "FILLED",
    note: null,
    selected: listing,
    alternatives: [],
  };
  return [...items, added];
}

/** What the renter sees at the foot of the bundle, recomputed from the items after every edit. */
export type BundleTotals = {
  rentalCents: number;
  depositCents: number;
  ownerCount: number;
  pickups: CrossOwnerBundlePickup[];
};

/** Totals for the picked listings; pickups are the distinct collection areas, nearest the renter first. */
export function bundleTotals(items: EditableItem[]): BundleTotals {
  const picks = items.flatMap((item) => (item.selected ? [item.selected] : []));
  const byArea = new Map<LocationArea, CrossOwnerBundlePickup>();
  for (const pick of picks) {
    const pickup = byArea.get(pick.location_area);
    if (pickup) pickup.item_count += 1;
    else byArea.set(pick.location_area, { location_area: pick.location_area, item_count: 1, distance_km: pick.distance_km });
  }
  const pickups = [...byArea.values()].sort(
    (a, b) =>
      Number(a.distance_km === null) - Number(b.distance_km === null) ||
      (a.distance_km ?? 0) - (b.distance_km ?? 0) ||
      a.location_area.localeCompare(b.location_area),
  );
  return {
    rentalCents: picks.reduce((sum, pick) => sum + pick.rental_subtotal_cents, 0),
    depositCents: picks.reduce((sum, pick) => sum + pick.deposit_cents, 0),
    ownerCount: new Set(picks.map((pick) => pick.owner_id)).size,
    pickups,
  };
}

/**
 * "Bedok · about 3.2 km away", or just the area without a location. The
 * distance is to the collection area's anchor, not the owner's address, so it
 * is always shown as approximate.
 */
export function collectionLabel(area: LocationArea, distanceKm: number | null): string {
  return distanceKm === null ? LOCATION_LABELS[area] : `${LOCATION_LABELS[area]} · about ${distanceKm.toFixed(1)} km away`;
}
