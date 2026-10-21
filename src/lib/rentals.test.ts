import { describe, expect, it } from "vitest";
import type { Booking, BookingStatus } from "@/lib/bookings";
import type { BundleBooking } from "@/lib/bundles";
import { renterDashboard } from "@/lib/rentals";

function booking(id: string, status: BookingStatus, start: string, end: string, extra: Partial<Booking> = {}): Booking {
  return {
    id,
    listing_id: `listing-${id}`,
    listing_name: `Item ${id}`,
    renter_id: "renter",
    owner_id: "owner",
    owner_name: "Olivia",
    start_date: start,
    end_date: end,
    status,
    deposit_cents: 5000,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    ...extra,
  };
}

function bundle(id: string, status: BookingStatus, start: string, end: string): BundleBooking {
  return {
    id,
    bundle_id: `bundle-${id}`,
    bundle_name: "Camping set",
    renter_id: "renter",
    renter_name: null,
    owner_id: "owner",
    owner_name: "Ben",
    start_date: start,
    end_date: end,
    status,
    rental_days: null,
    price_per_day_cents: null,
    price_per_week_cents: null,
    rental_subtotal_cents: null,
    platform_fee_bps: null,
    platform_fee_cents: null,
    deposit_cents: 12000,
    total_amount_cents: null,
    items: [],
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  };
}

describe("renterDashboard", () => {
  it("puts active and upcoming rentals in separate sections, soonest first (Scenario 2)", () => {
    const dashboard = renterDashboard(
      [
        booking("a1", "ACTIVE", "2026-10-15", "2026-10-25"),
        booking("u1", "CONFIRMED", "2026-11-05", "2026-11-07"),
        booking("a2", "ACTIVE", "2026-10-16", "2026-10-20"),
        booking("u2", "CONFIRMED", "2026-10-28", "2026-10-30"),
      ],
      [bundle("b1", "CONFIRMED", "2026-11-01", "2026-11-03")],
    );

    expect(dashboard.active.map((card) => card.id)).toEqual(["a2", "a1"]);
    expect(dashboard.upcoming.map((card) => card.id)).toEqual(["u2", "b1", "u1"]);
  });

  it("gives each card the item, owner, period, status and deposit", () => {
    const [card] = renterDashboard([booking("a1", "ACTIVE", "2026-10-15", "2026-10-25")], []).active;

    expect(card).toMatchObject({
      name: "Item a1",
      ownerName: "Olivia",
      startDate: "2026-10-15",
      endDate: "2026-10-25",
      status: "ACTIVE",
      depositCents: 5000,
      href: "/listings/listing-a1",
      detailsHref: "/profile?view=renter#booking-a1",
    });
  });

  it("shows a bundle by its own name and links to the bundle", () => {
    const [card] = renterDashboard([], [bundle("b1", "ACTIVE", "2026-10-15", "2026-10-17")]).active;

    expect(card).toMatchObject({
      kind: "BUNDLE",
      name: "Camping set",
      ownerName: "Ben",
      depositCents: 12000,
      href: "/bundles/bundle-b1",
      detailsHref: "/profile?view=renter#bundle-booking-b1",
    });
  });

  it("leaves requests and history out of both sections", () => {
    const dashboard = renterDashboard(
      [
        booking("p1", "PENDING", "2026-11-01", "2026-11-02"),
        booking("c1", "COMPLETED", "2026-09-01", "2026-09-02"),
        booking("x1", "CANCELLED", "2026-09-05", "2026-09-06"),
      ],
      [],
    );

    expect(dashboard.active).toEqual([]);
    expect(dashboard.upcoming).toEqual([]);
    expect(dashboard.pendingCount).toBe(1);
    expect(dashboard.hasAnyBooking).toBe(true);
  });

  it("knows when the renter has booked nothing at all (Scenario 3)", () => {
    expect(renterDashboard([], [])).toEqual({ active: [], upcoming: [], pendingCount: 0, hasAnyBooking: false });
  });

  it("flags a late rental and treats a missing deposit as none held", () => {
    const [card] = renterDashboard(
      [booking("a1", "ACTIVE", "2026-10-10", "2026-10-15", { overdue_since: "2026-10-16", deposit_cents: null })],
      [],
    ).active;

    expect(card.overdueSince).toBe("2026-10-16");
    expect(card.depositCents).toBe(0);
  });
});
