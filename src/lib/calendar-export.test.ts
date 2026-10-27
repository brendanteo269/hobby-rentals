import { describe, expect, it } from "vitest";
import { canAddMeetupToCalendar, canAddToCalendar, marketplaceToday } from "./calendar-export";

describe("canAddToCalendar", () => {
  const today = "2026-10-27";

  it("is true for a confirmed booking that has not ended", () => {
    expect(canAddToCalendar({ status: "CONFIRMED", end_date: "2026-11-01" }, today)).toBe(true);
    expect(canAddToCalendar({ status: "CONFIRMED", end_date: "2026-10-27" }, today)).toBe(true);
  });

  it("is false for every other status, including a rental already handed over", () => {
    for (const status of ["PENDING", "ACTIVE", "DECLINED", "CANCELLED", "EXPIRED", "COMPLETED"]) {
      expect(canAddToCalendar({ status, end_date: "2026-12-01" }, today)).toBe(false);
    }
  });

  it("is false for a confirmed booking that ended yesterday", () => {
    expect(canAddToCalendar({ status: "CONFIRMED", end_date: "2026-10-26" }, today)).toBe(false);
  });
});

describe("marketplaceToday", () => {
  it("uses Singapore's date, which is ahead of UTC late in the evening", () => {
    expect(marketplaceToday(new Date("2026-10-26T17:30:00Z"))).toBe("2026-10-27");
  });
});

describe("canAddMeetupToCalendar", () => {
  const now = new Date("2026-10-27T00:00:00Z");

  it("is true for a confirmed booking with an upcoming agreed meetup", () => {
    expect(canAddMeetupToCalendar({ status: "CONFIRMED", confirmed_meetup_time: "2026-11-03T02:00:00+00:00" }, now)).toBe(true);
  });

  it("is false with no agreed meetup, or one that has passed", () => {
    expect(canAddMeetupToCalendar({ status: "CONFIRMED", confirmed_meetup_time: null }, now)).toBe(false);
    expect(canAddMeetupToCalendar({ status: "CONFIRMED" }, now)).toBe(false);
    expect(canAddMeetupToCalendar({ status: "CONFIRMED", confirmed_meetup_time: "2026-10-26T02:00:00+00:00" }, now)).toBe(false);
  });

  it("is false once the booking is no longer confirmed", () => {
    for (const status of ["PENDING", "ACTIVE", "CANCELLED", "COMPLETED"]) {
      expect(canAddMeetupToCalendar({ status, confirmed_meetup_time: "2026-11-03T02:00:00+00:00" }, now)).toBe(false);
    }
  });
});
