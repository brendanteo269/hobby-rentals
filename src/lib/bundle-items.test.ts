import { describe, expect, it } from "vitest";
import {
  suggestedDeductionCents,
  adjustmentLines,
  deductionLabel,
  itemSettingsOf,
  omittedIds,
  parseItemSettings,
  sameItemSettings,
  substitutionLine,
} from "@/lib/bundle-items";
import type { Bundle, BundleItemSetting } from "@/lib/bundles";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("parseItemSettings", () => {
  it("reads each item as required, optional with its deduction, or with a backup", () => {
    const { items, fieldErrors } = parseItemSettings(
      form({ optional_lantern: "on", deduction_lantern: "5.00", alternative_tent: "spare", alternative_stove: "" }),
      ["tent", "stove", "lantern"],
    );

    expect(fieldErrors).toEqual({});
    expect(items).toEqual([
      { listing_id: "tent", optional: false, deduction_cents: null, alternative_listing_id: "spare" },
      { listing_id: "stove", optional: false, deduction_cents: null, alternative_listing_id: null },
      { listing_id: "lantern", optional: true, deduction_cents: 500, alternative_listing_id: null },
    ]);
  });

  it("asks for a deduction on an optional item", () => {
    for (const deduction of ["", "0", "-2"]) {
      const { fieldErrors } = parseItemSettings(form({ optional_lantern: "on", deduction_lantern: deduction }), ["tent", "lantern"]);
      expect(fieldErrors.deduction_lantern).toMatch(/takes off each day/);
    }
  });

  it("needs at least one required item", () => {
    const { fieldErrors } = parseItemSettings(
      form({ optional_a: "on", deduction_a: "1", optional_b: "on", deduction_b: "1" }),
      ["a", "b"],
    );
    expect(fieldErrors.listing_ids).toMatch(/at least one item has to be required/i);
  });

  it("drops the backup of an item that is optional, which can simply be left out", () => {
    const { items } = parseItemSettings(
      form({ optional_lantern: "on", deduction_lantern: "5", alternative_lantern: "spare" }),
      ["tent", "lantern"],
    );
    expect(items[1].alternative_listing_id).toBeNull();
  });

  it("refuses a backup used twice or one that is already an item", () => {
    expect(parseItemSettings(form({ alternative_a: "x", alternative_b: "x" }), ["a", "b"]).fieldErrors.listing_ids).toMatch(
      /backup for only one item/,
    );
    expect(parseItemSettings(form({ alternative_a: "b" }), ["a", "b"]).fieldErrors.listing_ids).toMatch(/another listing/);
  });
});

describe("itemSettingsOf and sameItemSettings", () => {
  const bundle = {
    items: [
      { id: "tent", is_optional: false, optional_deduction_cents: null, alternative: { id: "spare", name: "Spare", status: "ACTIVE" } },
      { id: "lantern", is_optional: true, optional_deduction_cents: 500, alternative: null },
    ],
  } as unknown as Bundle;

  it("reads a stored bundle as settings", () => {
    expect(itemSettingsOf(bundle)).toEqual([
      { listing_id: "tent", optional: false, deduction_cents: null, alternative_listing_id: "spare" },
      { listing_id: "lantern", optional: true, deduction_cents: 500, alternative_listing_id: null },
    ]);
  });

  it("is the same whatever order the items are in, and different when a setting changes", () => {
    const stored = itemSettingsOf(bundle);
    const reordered = [...stored].reverse();
    const changed: BundleItemSetting[] = stored.map((item) => (item.listing_id === "lantern" ? { ...item, deduction_cents: 600 } : item));

    expect(sameItemSettings(stored, reordered)).toBe(true);
    expect(sameItemSettings(stored, changed)).toBe(false);
  });
});

describe("what the renter sees", () => {
  const quote = {
    optional_items: [
      { listing_id: "lantern", name: "Lantern", deduction_per_day_cents: 500, available: true, included: true },
      { listing_id: "pump", name: "Pump", deduction_per_day_cents: 300, available: false, included: false },
    ],
  };

  it("sends as left out only the optional items that were unticked", () => {
    expect(omittedIds(quote, new Set(["lantern", "unrelated"]))).toEqual(["lantern"]);
    expect(omittedIds(quote, new Set())).toEqual([]);
    expect(omittedIds(null, new Set(["lantern"]))).toEqual([]);
  });

  it("says which item stands in for which", () => {
    expect(substitutionLine({ item_name: "Tent", alternative_name: "Spare tent" })).toBe("Includes Spare tent instead of Tent");
  });

  it("shows what an optional item takes off", () => {
    expect(deductionLabel(500)).toBe("−$5.00 / day");
  });

  it("lists what a booking changed, backups first", () => {
    expect(
      adjustmentLines({
        omitted: [{ listing_id: "lantern", name: "Lantern" }],
        substituted: [{ item_id: "tent", item_name: "Tent", alternative_id: "spare", alternative_name: "Spare tent" }],
      }),
    ).toEqual(["Includes Spare tent instead of Tent", "Without Lantern"]);
    expect(adjustmentLines(undefined)).toEqual([]);
    expect(adjustmentLines(null)).toEqual([]);
  });
});

describe("suggestedDeductionCents", () => {
  it("takes off the item's own price when the bundle costs at least the items combined", () => {
    expect(suggestedDeductionCents(2000, 10000, 10000)).toBe(2000);
    expect(suggestedDeductionCents(2000, 10000, 12000)).toBe(2000);
  });

  it("scales by the bundle's discount", () => {
    expect(suggestedDeductionCents(2000, 10000, 8000)).toBe(1600);
  });

  it("never reaches the whole bundle price", () => {
    expect(suggestedDeductionCents(9000, 9500, 9500)).toBe(9000);
    expect(suggestedDeductionCents(5000, 5000, 5000)).toBe(4999);
  });
});
