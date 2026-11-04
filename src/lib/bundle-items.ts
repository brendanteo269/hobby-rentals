/**
 * S5-10: optional and alternative items in a bundle, as the owner sets them and
 * as a renter sees them.
 *
 * Pure and free of `server-only`: the owner's form (a server action reads it),
 * the booking panel and the booking lists all use the same wording and rules.
 */

import { dollarsToCents, formatMoney } from "@/lib/format";
import type { Bundle, BundleAdjustments, BundleItemSetting, BundleQuote } from "@/lib/bundles";

/** Reads the owner's settings for each chosen listing out of the bundle form (fields `optional_<id>`, `deduction_<id>`, `alternative_<id>`). */
export function parseItemSettings(
  formData: FormData,
  listingIds: string[],
): { items: BundleItemSetting[]; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  const items: BundleItemSetting[] = listingIds.map((id) => {
    const optional = formData.get(`optional_${id}`) === "on";
    const alternative = String(formData.get(`alternative_${id}`) ?? "").trim() || null;
    const deduction = optional ? dollarsToCents(String(formData.get(`deduction_${id}`) ?? "")) : null;
    if (optional && (deduction === null || Number.isNaN(deduction) || deduction <= 0)) {
      fieldErrors[`deduction_${id}`] = "Enter what this takes off each day it is left out.";
    }
    return {
      listing_id: id,
      optional,
      deduction_cents: optional ? deduction : null,
      // An optional item can simply be left out, so it has no backup.
      alternative_listing_id: optional ? null : alternative,
    };
  });

  if (items.length > 0 && items.every((item) => item.optional)) {
    fieldErrors.listing_ids = "At least one item has to be required, or there is no bundle without the optional ones.";
  }
  const backups = items.flatMap((item) => (item.alternative_listing_id ? [item.alternative_listing_id] : []));
  if (new Set(backups).size !== backups.length) {
    fieldErrors.listing_ids = "A listing can be the backup for only one item.";
  } else if (backups.some((backup) => listingIds.includes(backup))) {
    fieldErrors.listing_ids = "A backup has to be another listing, not an item already in the bundle.";
  }
  return { items, fieldErrors };
}

/** A stored bundle's items as settings, to compare with what the form submitted. */
export function itemSettingsOf(bundle: Pick<Bundle, "items">): BundleItemSetting[] {
  return bundle.items.map((item) => ({
    listing_id: item.id,
    optional: item.is_optional,
    deduction_cents: item.is_optional ? item.optional_deduction_cents : null,
    alternative_listing_id: item.alternative?.id ?? null,
  }));
}

/** Whether two sets of item settings are the same, whatever order the items are in. */
export function sameItemSettings(a: BundleItemSetting[], b: BundleItemSetting[]): boolean {
  const key = (items: BundleItemSetting[]) =>
    JSON.stringify([...items].sort((x, y) => x.listing_id.localeCompare(y.listing_id)));
  return key(a) === key(b);
}

/** The optional items to send as left out: the ones the renter unticked. Unavailable ones are left out by the server. */
export function omittedIds(quote: Pick<BundleQuote, "optional_items"> | null, unticked: ReadonlySet<string>): string[] {
  return (quote?.optional_items ?? []).filter((item) => unticked.has(item.listing_id)).map((item) => item.listing_id);
}

/** S5-10 Scenario 4: what the bundle includes in place of an item that is out for the dates. */
export function substitutionLine(swap: { item_name: string; alternative_name: string }): string {
  return `Includes ${swap.alternative_name} instead of ${swap.item_name}`;
}

/** What an optional item takes off, as the tick box shows it. */
export function deductionLabel(deductionPerDayCents: number): string {
  return `−${formatMoney(deductionPerDayCents)} / day`;
}

/** Lines saying what a booking changed from the template, for the booking lists and the owner's review. */
export function adjustmentLines(adjustments: BundleAdjustments | null | undefined): string[] {
  if (!adjustments) return [];
  return [
    ...adjustments.substituted.map(substitutionLine),
    ...adjustments.omitted.map((item) => `Without ${item.name}`),
  ];
}

/**
 * What an optional item takes off each day by default (S5-10): its own listed
 * daily price when the bundle costs at least the items' combined price, else that
 * price scaled by the bundle's discount, so leaving items out never beats the
 * bundle's own saving. Never more than the bundle price itself.
 */
export function suggestedDeductionCents(itemDailyCents: number, itemsDailyCents: number, bundleDailyCents: number): number {
  if (itemsDailyCents <= 0 || bundleDailyCents <= 0) return 0;
  const share = bundleDailyCents >= itemsDailyCents ? itemDailyCents : (itemDailyCents * bundleDailyCents) / itemsDailyCents;
  return Math.max(1, Math.min(Math.round(share), bundleDailyCents - 1));
}
