import { describe, expect, it } from "vitest";
import {
  activeAlertFor,
  blockedDates,
  rangeIsBlocked,
  type AvailabilityAlert,
} from "@/lib/availability-alerts";
import type { UnavailableDate } from "@/lib/listings";

const unavailable: UnavailableDate[] = [
  { date: "2026-11-10", reason: "BLACKOUT" },
  { date: "2026-11-11", reason: "BLACKOUT" },
  { date: "2026-11-12", reason: "BOOKED" },
  { date: "2026-11-13", reason: "BLACKOUT" },
  { date: "2026-11-14", reason: "OFF_SCHEDULE" },
];

function alert(overrides: Partial<AvailabilityAlert> = {}): AvailabilityAlert {
  return {
    id: "a1",
    listing_id: "l1",
    start_date: "2026-11-10",
    end_date: "2026-11-11",
    status: "ACTIVE",
    created_at: "2026-11-01T00:00:00+00:00",
    ...overrides,
  };
}

describe("blockedDates", () => {
  it("takes only the days the owner closed", () => {
    expect([...blockedDates(unavailable)].sort()).toEqual(["2026-11-10", "2026-11-11", "2026-11-13"]);
  });

  it("leaves out booked days, which are the waitlist's job", () => {
    expect(blockedDates(unavailable).has("2026-11-12")).toBe(false);
  });

  it("leaves out days the owner never offered, which no blackout will free", () => {
    expect(blockedDates(unavailable).has("2026-11-14")).toBe(false);
  });
});

describe("rangeIsBlocked", () => {
  const blocked = blockedDates(unavailable);

  it("accepts a range where every day is blocked", () => {
    expect(rangeIsBlocked("2026-11-10", "2026-11-11", blocked)).toBe(true);
  });

  it("accepts a single blocked day", () => {
    expect(rangeIsBlocked("2026-11-13", "2026-11-13", blocked)).toBe(true);
  });

  it("refuses a range with a bookable day in the middle", () => {
    // The 12th is booked, not blacked out - the alert would never fire for it.
    expect(rangeIsBlocked("2026-11-10", "2026-11-13", blocked)).toBe(false);
  });

  it("refuses an empty or backwards range", () => {
    expect(rangeIsBlocked("", "2026-11-11", blocked)).toBe(false);
    expect(rangeIsBlocked("2026-11-11", "2026-11-10", blocked)).toBe(false);
  });
});

describe("activeAlertFor", () => {
  it("finds the alert covering exactly those dates", () => {
    expect(activeAlertFor([alert()], "2026-11-10", "2026-11-11")?.id).toBe("a1");
  });

  it("ignores an alert on a different range", () => {
    expect(activeAlertFor([alert()], "2026-11-10", "2026-11-13")).toBeUndefined();
  });

  it("ignores a fulfilled or cancelled alert, so the renter can watch again", () => {
    expect(activeAlertFor([alert({ status: "FULFILLED" })], "2026-11-10", "2026-11-11")).toBeUndefined();
    expect(activeAlertFor([alert({ status: "CANCELLED" })], "2026-11-10", "2026-11-11")).toBeUndefined();
  });
});
