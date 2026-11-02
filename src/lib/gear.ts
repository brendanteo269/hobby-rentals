/**
 * S5-01 public pages: their URLs and what the public API returns. Safe for
 * client components.
 *
 * A URL is the name as words plus the item's short id (the first 8 characters
 * of its uuid): /gear/coleman-sundome-4-person-tent-10a6532f. Only the short id
 * is looked up, so a renamed listing's old links still work and redirect to
 * the current name.
 */

import type { Route } from "next";
import type { ListingCondition, LocationArea, SerialStatus } from "@/lib/listings";
import type { ReviewCollection } from "@/lib/reviews";

export type PublicListing = {
  id: string;
  short_id: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  condition: ListingCondition;
  location_area: LocationArea;
  price_per_day_cents: number | null;
  price_per_week_cents: number | null;
  deposit_cents: number;
  min_rental_days: number | null;
  max_rental_days: number | null;
  available_from: string;
  available_until: string | null;
  specifications: { label: string; value: string }[];
  photo_urls: string[];
  instant_book_enabled: boolean;
  owner_display_name: string | null;
  owner_verified: boolean;
  serial_status: SerialStatus | null;
  reviews: ReviewCollection;
  updated_at: string;
};

export type PublicBundleItem = {
  short_id: string;
  name: string;
  category: string;
  brand: string;
  condition: ListingCondition;
  price_per_day_cents: number | null;
  price_per_week_cents: number | null;
  photo_urls: string[];
};

export type PublicBundle = {
  id: string;
  short_id: string;
  name: string;
  description: string | null;
  price_per_day_cents: number | null;
  price_per_week_cents: number | null;
  deposit_cents: number;
  min_rental_days: number | null;
  max_rental_days: number | null;
  items: PublicBundleItem[];
  reviews: ReviewCollection;
  updated_at: string;
};

/** S5-02: what /sitemap.xml lists, one entry per live listing or bundle. */
export type SitemapEntries = {
  listings: { name: string; short_id: string; updated_at: string }[];
  bundles: { name: string; short_id: string; updated_at: string }[];
};

/** "Coleman Sundome 4-Person Tent" -> "coleman-sundome-4-person-tent". */
export function slugify(name: string): string {
  return name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "item";
}

export function gearPath(item: { name: string; short_id: string }): Route {
  return `/gear/${slugify(item.name)}-${item.short_id}` as Route;
}

export function gearBundlePath(bundle: { name: string; short_id: string }): Route {
  return `/gear/bundles/${slugify(bundle.name)}-${bundle.short_id}` as Route;
}

/** The short id at the end of a /gear slug, or null if the slug has none. */
export function shortIdFrom(slug: string): string | null {
  return /-([0-9a-f]{8})$/i.exec(slug)?.[1]?.toLowerCase() ?? null;
}

/** A signed-out visitor's way to act: log in, then come back to this page. */
export function loginToAct(path: string): Route {
  return `/login?next=${encodeURIComponent(path)}` as Route;
}
