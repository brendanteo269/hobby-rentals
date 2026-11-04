import { describe, expect, it } from "vitest";
import {
  kitFailureMessage,
  kitItemsOf,
  pendingItemCount,
  quotedItemCount,
  type Kit,
  type KitItem,
  type KitQuote,
} from "@/lib/booking-groups";
import { editableItems, type CrossOwnerBundleItem, type CrossOwnerBundleListing } from "@/lib/cross-owner-bundles";

function listing(id: string): CrossOwnerBundleListing {
  return {
    id, name: id, category: "CAMPING_OUTDOOR", owner_id: `owner-${id}`, owner_name: null, owner_verified: false,
    location_area: "BEDOK", distance_km: null, primary_photo_url: null, price_per_day_cents: 1000,
    price_per_week_cents: null, rental_days: 2, rental_subtotal_cents: 2000, deposit_cents: 500,
  };
}

const bundleItem = (need: string, selected: CrossOwnerBundleListing | null): CrossOwnerBundleItem => ({
  need, reason: "", status: selected ? "FILLED" : "NOT_LISTED", note: null, selected, alternatives: [],
});

function kitItem(status: KitItem["status"]): KitItem {
  return {
    booking_id: status, listing_id: status, listing_name: status, primary_photo_url: null, owner_id: "o", owner_name: null,
    status, payment_status: null, rental_subtotal_cents: 0, platform_fee_cents: 0, deposit_cents: 0,
    protection_fee_cents: 0, total_amount_cents: 0, respond_by: null, decline_reason: null,
  };
}

describe("kitItemsOf", () => {
  const items = editableItems([bundleItem("tent", listing("t1")), bundleItem("stove", listing("s1")), bundleItem("bag", null)]);

  it("requests the picked listings and leaves out an item with no pick", () => {
    expect(kitItemsOf(items)).toEqual([
      { listing_id: "t1", damage_protection: false },
      { listing_id: "s1", damage_protection: false },
    ]);
  });

  it("asks for protection only on the listings the renter chose it for", () => {
    expect(kitItemsOf(items, new Set(["s1"]))).toEqual([
      { listing_id: "t1", damage_protection: false },
      { listing_id: "s1", damage_protection: true },
    ]);
  });
});

describe("kitFailureMessage", () => {
  const failure = { listing_id: "c", listing_name: "Cooler Box", owner_name: "Bob", at: null };

  it("names the item that was declined and says the holds are released", () => {
    const message = kitFailureMessage({ ...failure, reason: "DECLINED" });
    expect(message).toContain("Cooler Box from Bob was declined");
    expect(message).toContain("every hold has been released");
  });

  it("says when an owner did not answer in time", () => {
    expect(kitFailureMessage({ ...failure, reason: "EXPIRED" })).toContain("was not answered in time");
  });

  it("still reads when the item or owner is unknown", () => {
    expect(kitFailureMessage({ ...failure, listing_name: null, owner_name: null, reason: "DECLINED" })).toMatch(/^an item was declined/);
  });

  it("a withdrawn kit says the renter did it", () => {
    expect(kitFailureMessage({ ...failure, reason: "WITHDRAWN" })).toBe("You withdrew this kit. Every hold has been released.");
  });
});

describe("counts", () => {
  it("counts the items an owner has yet to answer", () => {
    const kit = { items: [kitItem("PENDING"), kitItem("CONFIRMED"), kitItem("PENDING")] } as Kit;
    expect(pendingItemCount(kit)).toBe(2);
  });

  it("counts the items of a priced kit across owners", () => {
    const quote = { owners: [{ items: [1, 2] }, { items: [3] }] } as unknown as KitQuote;
    expect(quotedItemCount(quote)).toBe(3);
  });
});
