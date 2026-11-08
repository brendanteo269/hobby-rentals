import { describe, expect, it } from "vitest";
import { guidesByBooking, updatedSinceBooking } from "@/lib/guides";

describe("updatedSinceBooking", () => {
  const bookedAt = "2026-11-01T09:00:00+00:00";

  it("is true once the owner changes the guide after the booking was made", () => {
    expect(updatedSinceBooking({ updated_at: "2026-11-06T10:00:00+00:00" }, bookedAt)).toBe(true);
  });

  it("is false for a guide last changed before the booking", () => {
    expect(updatedSinceBooking({ updated_at: "2026-10-30T10:00:00+00:00" }, bookedAt)).toBe(false);
  });

  it("compares instants, not strings, so different offsets for the same moment are not a change", () => {
    expect(updatedSinceBooking({ updated_at: "2026-11-01T17:00:00+08:00" }, bookedAt)).toBe(false);
    expect(updatedSinceBooking({ updated_at: "2026-11-01T17:00:01+08:00" }, bookedAt)).toBe(true);
  });
});

describe("guidesByBooking", () => {
  it("keys the renter's guide index by booking", () => {
    const entry = { booking_id: "b1", listing_id: "l1", booked_at: "2026-11-01T09:00:00Z", updated_at: "2026-11-02T09:00:00Z" };

    const byBooking = guidesByBooking([entry]);

    expect(byBooking.get("b1")).toBe(entry);
    expect(byBooking.has("b2")).toBe(false);
  });
});
