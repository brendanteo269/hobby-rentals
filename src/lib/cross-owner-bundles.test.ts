import { describe, expect, it } from "vitest";
import {
  addListing,
  bundleTotals,
  editableItems,
  removeItem,
  swapItem,
  type CrossOwnerBundleItem,
  type CrossOwnerBundleListing,
} from "@/lib/cross-owner-bundles";

function listing(id: string, overrides: Partial<CrossOwnerBundleListing> = {}): CrossOwnerBundleListing {
  return {
    id,
    name: `Listing ${id}`,
    category: "OUTDOORS",
    owner_id: `owner-${id}`,
    owner_name: null,
    owner_verified: false,
    location_area: "BEDOK",
    distance_km: null,
    primary_photo_url: null,
    price_per_day_cents: 1000,
    price_per_week_cents: null,
    rental_days: 2,
    rental_subtotal_cents: 2000,
    deposit_cents: 5000,
    ...overrides,
  };
}

function item(need: string, selected: CrossOwnerBundleListing | null, alternatives: CrossOwnerBundleListing[] = []): CrossOwnerBundleItem {
  return { need, reason: "Because.", status: selected ? "FILLED" : "NOT_LISTED", note: null, selected, alternatives };
}

const items = () =>
  editableItems([
    item("tent", listing("t1", { rental_subtotal_cents: 3000 }), [listing("t2", { rental_subtotal_cents: 1500 })]),
    item("stove", listing("s1", { location_area: "TAMPINES", distance_km: 4 })),
    item("sleeping bag", null),
  ]);

describe("bundleTotals", () => {
  it("adds up the picked items and ignores an item with no pick", () => {
    const totals = bundleTotals(items());
    expect(totals.rentalCents).toBe(5000);
    expect(totals.depositCents).toBe(10000);
    expect(totals.ownerCount).toBe(2);
  });

  it("counts one owner once however many items they supply", () => {
    const same = editableItems([
      item("tent", listing("t1", { owner_id: "alice" })),
      item("stove", listing("s1", { owner_id: "alice" })),
    ]);
    expect(bundleTotals(same).ownerCount).toBe(1);
  });

  it("groups pickups by area, nearest the renter first, areas with no distance last", () => {
    const grouped = editableItems([
      item("a", listing("a", { location_area: "WOODLANDS", distance_km: 20 })),
      item("b", listing("b", { location_area: "BEDOK", distance_km: 2 })),
      item("c", listing("c", { location_area: "BEDOK", distance_km: 2 })),
      item("d", listing("d", { location_area: "BISHAN", distance_km: null })),
    ]);
    expect(bundleTotals(grouped).pickups).toEqual([
      { location_area: "BEDOK", item_count: 2, distance_km: 2 },
      { location_area: "WOODLANDS", item_count: 1, distance_km: 20 },
      { location_area: "BISHAN", item_count: 1, distance_km: null },
    ]);
  });
});

describe("removeItem", () => {
  it("drops the item and lowers the total straight away", () => {
    const next = removeItem(items(), "tent");
    expect(next.map((entry) => entry.id)).toEqual(["stove", "sleeping bag"]);
    expect(bundleTotals(next).rentalCents).toBe(2000);
  });
});

describe("swapItem", () => {
  it("makes the alternative the pick and keeps the old pick as an alternative", () => {
    const next = swapItem(items(), "tent", "t2");
    const tent = next.find((entry) => entry.id === "tent")!;
    expect(tent.selected?.id).toBe("t2");
    expect(tent.alternatives.map((entry) => entry.id)).toEqual(["t1"]);
    expect(bundleTotals(next).rentalCents).toBe(3500);
  });

  it("is undone by swapping back", () => {
    const back = swapItem(swapItem(items(), "tent", "t2"), "tent", "t1");
    expect(back).toEqual(items());
  });

  it("ignores a listing that is not one of the alternatives", () => {
    expect(swapItem(items(), "tent", "nope")).toEqual(items());
  });
});

describe("addListing", () => {
  it("adds the listing as its own item and raises the total", () => {
    const next = addListing(items(), listing("h1", { rental_subtotal_cents: 700 }));
    expect(next.at(-1)).toMatchObject({ id: "added:h1", reason: "Added by you", status: "FILLED" });
    expect(bundleTotals(next).rentalCents).toBe(5700);
  });

  it("refuses a listing already in the bundle", () => {
    expect(addListing(items(), listing("t1"))).toEqual(items());
  });
});
