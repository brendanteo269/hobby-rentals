import { describe, expect, it } from "vitest";
import {
  suggestedDeductionCents,
  adjustmentLines,
  deductionLabel,
  backupUseByDay,
  backupLimitAlong,
  itemSettingsOf,
  omittedIds,
  parseItemSettings,
  rangeIsBookable,
  sameItemSettings,
  substitutionLine,
  uncoveredBy,
} from "@/lib/bundle-items";
import type { Bundle, BundleBackupCoverage, BundleItemSetting } from "@/lib/bundles";

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

describe("rangeIsBookable", () => {
  // The camera is free on the 14th and 15th and out on the 16th and 17th; its backup is free on the 15th to the 17th.
  const camera: BundleBackupCoverage = {
    item_id: "fx3",
    item_name: "Sony FX3",
    backup_id: "a7",
    backup_name: "Sony A7 IV",
    item_free: ["2026-11-14", "2026-11-15"],
    backup_free: ["2026-11-15", "2026-11-16", "2026-11-17"],
  };

  it("accepts a range the item covers whole, or one its backup covers whole", () => {
    expect(rangeIsBookable([camera], ["2026-11-14", "2026-11-15"])).toBe(true);
    expect(rangeIsBookable([camera], ["2026-11-15", "2026-11-16", "2026-11-17"])).toBe(true);
  });

  it("refuses a range that is free day by day but covered whole by neither", () => {
    expect(rangeIsBookable([camera], ["2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17"])).toBe(false);
    expect(rangeIsBookable([camera], ["2026-11-14", "2026-11-15", "2026-11-16"])).toBe(false);
  });

  it("names the item that is half covered", () => {
    expect(uncoveredBy([camera], ["2026-11-14", "2026-11-16"])?.item_name).toBe("Sony FX3");
    expect(uncoveredBy([camera], ["2026-11-14", "2026-11-15"])).toBeNull();
  });

  it("is satisfied when there is nothing with a backup to check", () => {
    expect(rangeIsBookable([], ["2026-11-14", "2026-11-17"])).toBe(true);
  });

  it("needs every such item covered, not just one", () => {
    const lens: BundleBackupCoverage = { ...camera, item_id: "lens", item_free: ["2026-11-14"], backup_free: [] };
    expect(rangeIsBookable([camera, lens], ["2026-11-14", "2026-11-15"])).toBe(false);
    expect(rangeIsBookable([camera, lens], ["2026-11-14"])).toBe(true);
  });
});

describe("backupLimitAlong", () => {
  const camera: BundleBackupCoverage = {
    item_id: "fx3",
    item_name: "Sony FX3",
    backup_id: "a7",
    backup_name: "Sony A7 IV",
    item_free: ["2026-11-14", "2026-11-15"],
    backup_free: ["2026-11-15", "2026-11-16", "2026-11-17"],
  };
  const run = ["2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17"];

  it("finds the last day a rental can end on and the day it cannot reach", () => {
    expect(backupLimitAlong([camera], run)).toEqual({ lastOk: "2026-11-15", blocked: "2026-11-16", short: camera });
  });

  it("is null when the whole run is bookable as one range, or there is nothing to check", () => {
    expect(backupLimitAlong([camera], run.slice(1))).toBeNull();
    expect(backupLimitAlong([], run)).toBeNull();
  });
});

describe("backupUseByDay", () => {
  const camera: BundleBackupCoverage = {
    item_id: "fx3",
    item_name: "Sony FX3",
    backup_id: "a7",
    backup_name: "Sony A7 IV",
    item_free: ["2026-11-14", "2026-11-15", "2026-11-21"],
    backup_free: ["2026-11-15", "2026-11-16", "2026-11-17"],
  };
  const days = ["2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17", "2026-11-21"];

  it("marks only the days the item is out and its backup is free, saying what stands in", () => {
    const uses = backupUseByDay([camera], days);
    expect([...uses.keys()]).toEqual(["2026-11-16", "2026-11-17"]);
    expect(uses.get("2026-11-16")).toEqual(["Sony A7 IV instead of Sony FX3"]);
  });

  it("leaves a day the item itself covers plain, even when its backup is free too", () => {
    expect(backupUseByDay([camera], days).has("2026-11-15")).toBe(false);
  });

  it("ignores days the bundle cannot be booked on, and says nothing when there are no backups", () => {
    expect(backupUseByDay([camera], ["2026-11-14"]).size).toBe(0);
    expect(backupUseByDay([], days).size).toBe(0);
  });

  it("lists every backup a day needs", () => {
    const lens: BundleBackupCoverage = { ...camera, item_id: "lens", item_name: "Lens", backup_name: "Spare lens", item_free: [], backup_free: ["2026-11-16"] };
    expect(backupUseByDay([camera, lens], ["2026-11-16"]).get("2026-11-16")).toEqual([
      "Sony A7 IV instead of Sony FX3",
      "Spare lens instead of Lens",
    ]);
  });
});
