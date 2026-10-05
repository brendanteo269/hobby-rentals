import { describe, expect, it } from "vitest";
import { hasLiveOffer, isOpen, waitlistDays, type WaitlistEntry } from "@/lib/waitlist";

const entry = (overrides: Partial<WaitlistEntry> = {}): WaitlistEntry => ({
  id: "w1",
  listing_id: "l1",
  listing_name: "Kayak",
  renter_id: "r1",
  start_date: "2026-10-12",
  end_date: "2026-10-14",
  status: "WAITING",
  offered_at: null,
  offer_expires_at: null,
  created_at: "2026-10-05T00:00:00+00:00",
  updated_at: "2026-10-05T00:00:00+00:00",
  ...overrides,
});

describe("isOpen", () => {
  it.each(["WAITING", "OFFERED"] as const)("counts %s as still in the queue", (status) => {
    expect(isOpen(entry({ status }))).toBe(true);
  });

  it.each(["BOOKED", "EXPIRED", "LEFT"] as const)("counts %s as finished", (status) => {
    expect(isOpen(entry({ status }))).toBe(false);
  });
});

describe("hasLiveOffer", () => {
  const now = new Date("2026-10-06T12:00:00Z");

  it("is true while the 24 hours are still running", () => {
    const offered = entry({ status: "OFFERED", offer_expires_at: "2026-10-06T15:00:00+00:00" });
    expect(hasLiveOffer(offered, now)).toBe(true);
  });

  /**
   * The sweep closes a lapsed offer, but it runs every 15 minutes - so a row
   * can read OFFERED with its deadline already behind it. Treating that as
   * live would invite the renter to book dates about to pass to the next
   * person in the queue.
   */
  it("is false once the deadline has passed, even before the sweep tidies it", () => {
    const lapsed = entry({ status: "OFFERED", offer_expires_at: "2026-10-06T09:00:00+00:00" });
    expect(hasLiveOffer(lapsed, now)).toBe(false);
  });

  it("is false for someone still waiting their turn", () => {
    expect(hasLiveOffer(entry({ status: "WAITING" }), now)).toBe(false);
  });

  it("is false for an offered entry carrying no deadline", () => {
    expect(hasLiveOffer(entry({ status: "OFFERED" }), now)).toBe(false);
  });

  it("is false once the entry has been closed", () => {
    const expired = entry({ status: "EXPIRED", offer_expires_at: "2026-10-06T15:00:00+00:00" });
    expect(hasLiveOffer(expired, now)).toBe(false);
  });
});

describe("waitlistDays", () => {
  it("counts both ends of the range", () => {
    expect(waitlistDays({ start_date: "2026-10-12", end_date: "2026-10-14" })).toBe(3);
  });

  it("counts a single day as one", () => {
    expect(waitlistDays({ start_date: "2026-10-12", end_date: "2026-10-12" })).toBe(1);
  });

  it("is unaffected by the clocks going back", () => {
    expect(waitlistDays({ start_date: "2026-10-24", end_date: "2026-10-26" })).toBe(3);
  });
});
