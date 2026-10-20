import { describe, expect, it } from "vitest";
import { canConfirmHandover, handoverStatusLine, type HandoverState } from "@/lib/handover";

const TODAY = "2026-10-20";
const done: HandoverState = { inspection_status: "COMPLETED", renter_confirmed_at: null, owner_confirmed_at: null };
const booking = (overrides: Partial<Parameters<typeof canConfirmHandover>[0]> = {}) => ({
  status: "CONFIRMED" as const,
  start_date: TODAY,
  handover_state: done,
  ...overrides,
});

describe("canConfirmHandover", () => {
  it("is open to both sides once the photos are in and the rental has started", () => {
    expect(canConfirmHandover(booking(), "renter", TODAY)).toBe(true);
    expect(canConfirmHandover(booking(), "owner", TODAY)).toBe(true);
  });
  it("is closed until the pickup photos are complete", () => {
    for (const inspection_status of [null, "IN_PROGRESS"] as const) {
      expect(canConfirmHandover(booking({ handover_state: { ...done, inspection_status } }), "renter", TODAY)).toBe(false);
    }
  });
  it("is closed before the start date and for bookings that are not confirmed", () => {
    expect(canConfirmHandover(booking({ start_date: "2026-10-21" }), "renter", TODAY)).toBe(false);
    expect(canConfirmHandover(booking({ status: "PENDING" }), "renter", TODAY)).toBe(false);
    expect(canConfirmHandover(booking({ status: "ACTIVE" }), "renter", TODAY)).toBe(false);
  });
  it("is closed for a side that has already confirmed, and open for the other", () => {
    const state = { ...done, renter_confirmed_at: "2026-10-20T01:00:00Z" };
    expect(canConfirmHandover(booking({ handover_state: state }), "renter", TODAY)).toBe(false);
    expect(canConfirmHandover(booking({ handover_state: state }), "owner", TODAY)).toBe(true);
  });
});

describe("handoverStatusLine", () => {
  it("tells the owner the confirmation is still outstanding after the renter's", () => {
    const state = { ...done, renter_confirmed_at: "2026-10-20T01:00:00Z" };
    expect(handoverStatusLine(state, "renter", TODAY, TODAY)).toMatch(/Waiting for the owner/);
    expect(handoverStatusLine(state, "owner", TODAY, TODAY)).toMatch(/renter confirmed the handover/);
  });
  it("asks for the photos first", () => {
    expect(handoverStatusLine({ ...done, inspection_status: null }, "renter", TODAY, TODAY)).toMatch(/Take the pickup photos/);
    expect(handoverStatusLine({ ...done, inspection_status: null }, "owner", TODAY, TODAY)).toMatch(/pickup photos are needed/);
  });
  it("says nothing once both have confirmed", () => {
    const both = { ...done, renter_confirmed_at: "a", owner_confirmed_at: "b" };
    expect(handoverStatusLine(both, "owner", TODAY, TODAY)).toBeNull();
  });
});
