import { describe, expect, it } from "vitest";
import { calendarOutcome, NO_BOOKINGS_TO_EXPORT } from "./calendar-export";

describe("calendarOutcome", () => {
  it("downloads when there are events", () => {
    expect(calendarOutcome({ event_count: 2, filename: "a.ics", ics: "BEGIN:VCALENDAR" })).toEqual({
      kind: "download", filename: "a.ics", ics: "BEGIN:VCALENDAR", count: 2,
    });
  });

  it("tells the member and downloads nothing when there are no events", () => {
    expect(calendarOutcome({ event_count: 0, filename: "a.ics", ics: "" })).toEqual({ kind: "empty", message: NO_BOOKINGS_TO_EXPORT });
  });

  it("never offers an empty file even if the count and text disagree", () => {
    expect(calendarOutcome({ event_count: 1, filename: "a.ics", ics: "" }).kind).toBe("empty");
  });
});
