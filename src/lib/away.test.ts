import { describe, expect, it } from "vitest";
import { awayMessagePlaceholder, bookingPauseHeadline, isDeclinable, latestAwayEnd, type AwayClash } from "@/lib/away";

const pause = { start_date: "2026-12-20", end_date: "2027-01-03", message: null };

describe("bookingPauseHeadline", () => {
  it("names only the end once the period is under way", () => {
    expect(bookingPauseHeadline(pause, "2026-12-20")).toBe("Not taking bookings until 3 Jan");
    expect(bookingPauseHeadline(pause, "2026-12-28")).toBe("Not taking bookings until 3 Jan");
  });

  it("gives the whole range before it starts", () => {
    expect(bookingPauseHeadline(pause, "2026-12-19")).toBe("Not taking bookings 20 Dec 2026 – 3 Jan 2027");
  });

  it("never tells a renter the owner is away", () => {
    // Saying so publicly says a home is empty (S5-15).
    expect(bookingPauseHeadline(pause, "2026-12-25").toLowerCase()).not.toContain("away");
    expect(awayMessagePlaceholder("2027-01-03").toLowerCase()).not.toContain("away");
  });
});

describe("awayMessagePlaceholder", () => {
  it("dates the suggestion to the period picked", () => {
    expect(awayMessagePlaceholder("2027-01-03")).toBe("Back after 3 Jan — thank you for your patience.");
  });

  it("still reads before an end date is picked", () => {
    expect(awayMessagePlaceholder("")).toBe("Back soon — thank you for your patience.");
  });
});

describe("latestAwayEnd", () => {
  it("allows ninety days counting the first, as the backend does", () => {
    expect(latestAwayEnd("2026-12-20")).toBe("2027-03-19");
  });
});

describe("isDeclinable", () => {
  const clash = (status: AwayClash["status"]): AwayClash => ({
    id: "c1", kind: "LISTING", item_name: "Tent", renter_name: null, status, start_date: "2026-12-21", end_date: "2026-12-22",
  });

  it("offers only pending requests; confirmed and active bookings are kept", () => {
    expect(isDeclinable(clash("PENDING"))).toBe(true);
    expect(isDeclinable(clash("CONFIRMED"))).toBe(false);
    expect(isDeclinable(clash("ACTIVE"))).toBe(false);
  });
});
