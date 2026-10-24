import { describe, expect, it } from "vitest";
import type { Booking, BookingStatus } from "@/lib/bookings";
import type { BundleBooking } from "@/lib/bundles";
import { isRentalFilter, matchesRentalFilter, renterActionItems, renterDashboard } from "@/lib/rentals";

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
      detailsHref: "/rentals/bookings#booking-a1",
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
      detailsHref: "/rentals/bookings#bundle-booking-b1",
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

describe("matchesRentalFilter", () => {
  it("shows every booking with no filter", () => {
    expect(matchesRentalFilter("DECLINED", undefined)).toBe(true);
  });

  it("files declined, cancelled and lapsed requests under Cancelled", () => {
    expect(matchesRentalFilter("DECLINED", "cancelled")).toBe(true);
    expect(matchesRentalFilter("EXPIRED", "cancelled")).toBe(true);
    expect(matchesRentalFilter("COMPLETED", "cancelled")).toBe(false);
  });

  it("only accepts the filters the tab offers", () => {
    expect(isRentalFilter("past")).toBe(true);
    expect(isRentalFilter("overdue")).toBe(false);
  });
});

describe("renterActionItems", () => {
  const today = "2026-10-20";
  const now = new Date("2026-10-20T09:00:00Z");
  const none = { bookings: [], bundleBookings: [], waitlist: [], reviewEligibility: [] };

  it("asks for return photos once a rental is due back, and flags it when late", () => {
    const [due] = renterActionItems({ ...none, bookings: [booking("a1", "ACTIVE", "2026-10-15", "2026-10-20")] }, today, now);
    expect(due).toMatchObject({ rowId: "booking-a1", title: "Take the return photos", detail: "Due back today", urgent: false });

    const [late] = renterActionItems(
      { ...none, bookings: [booking("a2", "ACTIVE", "2026-10-10", "2026-10-15", { overdue_since: "2026-10-16" })] },
      today,
      now,
    );
    expect(late.urgent).toBe(true);
  });

  it("does not nag about a rental that is not due back yet", () => {
    expect(renterActionItems({ ...none, bookings: [booking("a1", "ACTIVE", "2026-10-15", "2026-10-25")] }, today, now)).toEqual([]);
  });

  it("asks for pickup photos from the start date, not before", () => {
    const early = renterActionItems({ ...none, bookings: [booking("u1", "CONFIRMED", "2026-10-22", "2026-10-25")] }, today, now);
    expect(early).toEqual([]);

    const [pickup] = renterActionItems({ ...none, bookings: [booking("u2", "CONFIRMED", "2026-10-20", "2026-10-25")] }, today, now);
    expect(pickup).toMatchObject({ title: "Take the pickup photos", detail: "Collecting today" });
  });

  it("offers the confirm button once the return photos are in", () => {
    const items = renterActionItems(
      {
        ...none,
        bookings: [
          booking("a1", "ACTIVE", "2026-10-15", "2026-10-20", {
            return_state: { inspection_status: "COMPLETED", renter_confirmed_at: null, owner_confirmed_at: null },
          }),
        ],
      },
      today,
      now,
    );
    expect(items).toEqual([expect.objectContaining({ action: { kind: "confirm-return", bookingId: "a1" } })]);
  });

  it("lists only the renter's own reviews of owners, after anything urgent", () => {
    const review = (bookingId: string, role: "OWNER" | "RENTER") => ({
      booking_id: bookingId,
      bundle_booking_id: null,
      rental_name: `Item ${bookingId}`,
      reviewed_role: role,
      settled_at: "2026-10-18T00:00:00Z",
      expires_at: "2026-11-01T00:00:00Z",
    });
    const items = renterActionItems(
      {
        ...none,
        bookings: [
          booking("c1", "COMPLETED", "2026-10-01", "2026-10-02"),
          booking("a2", "ACTIVE", "2026-10-10", "2026-10-15", { overdue_since: "2026-10-16" }),
        ],
        // "x9" is a rental the member owned: reviewing that renter is not a renting task.
        reviewEligibility: [review("c1", "OWNER"), review("x9", "RENTER")],
      },
      today,
      now,
    );
    expect(items.map((item) => item.title)).toEqual(["Take the return photos", "Rate the owner"]);
  });
});

describe("renterDashboard handover", () => {
  it("carries a confirmed booking's handover state to its card, for the progress tracker", () => {
    const handover_state = { inspection_status: "COMPLETED" as const, renter_confirmed_at: null, owner_confirmed_at: null };
    const [card] = renterDashboard([booking("u1", "CONFIRMED", "2026-11-01", "2026-11-03", { handover_state })], []).upcoming;
    expect(card.handover).toEqual(handover_state);
  });

  it("has no handover on a bundle's card", () => {
    const [card] = renterDashboard([], [bundle("b1", "CONFIRMED", "2026-11-01", "2026-11-03")]).upcoming;
    expect(card.handover).toBeNull();
  });
});
