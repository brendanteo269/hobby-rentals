import { describe, expect, it } from "vitest";
import { cancelBlockedReason, canConfirmHandover, handoverPeriodOver, handoverConfirmed, handoverStatusLine, handoverSteps, type HandoverState } from "@/lib/handover";

const TODAY = "2026-10-20";
const done: HandoverState = { inspection_status: "COMPLETED", renter_confirmed_at: null, owner_confirmed_at: null };
const booking = (overrides: Partial<Parameters<typeof canConfirmHandover>[0]> = {}) => ({
  status: "CONFIRMED" as const,
  start_date: TODAY,
  end_date: "2026-10-22",
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
  it("is open on the last day and closed once the end date has passed", () => {
    expect(canConfirmHandover(booking({ start_date: "2026-10-18", end_date: TODAY }), "renter", TODAY)).toBe(true);
    expect(canConfirmHandover(booking({ start_date: "2026-10-17", end_date: "2026-10-19" }), "renter", TODAY)).toBe(false);
    expect(handoverPeriodOver({ end_date: "2026-10-19" }, TODAY)).toBe(true);
    expect(handoverPeriodOver({ end_date: TODAY }, TODAY)).toBe(false);
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

describe("handoverSteps", () => {
  const states = (viewer: "renter" | "owner", state: HandoverState, start = TODAY) =>
    handoverSteps({ start_date: start, handover_state: state }, viewer, TODAY).map((step) => `${step.key}:${step.state}`);

  it("starts the renter at the photos", () => {
    expect(states("renter", { ...done, inspection_status: null })).toEqual([
      "booked:done", "photos:current", "mine:upcoming", "theirs:upcoming", "starts:upcoming",
    ]);
  });
  it("moves the renter to confirming once the photos are in, then to waiting", () => {
    expect(states("renter", done)).toEqual(["booked:done", "photos:done", "mine:current", "theirs:upcoming", "starts:upcoming"]);
    expect(states("renter", { ...done, renter_confirmed_at: "t" })).toEqual([
      "booked:done", "photos:done", "mine:done", "theirs:current", "starts:upcoming",
    ]);
  });
  it("keeps the current step on the side still to confirm when the other went first", () => {
    expect(states("renter", { ...done, owner_confirmed_at: "t" })).toEqual([
      "booked:done", "photos:done", "mine:current", "theirs:done", "starts:upcoming",
    ]);
  });
  it("shows the owner the renter's progress before their own turn", () => {
    expect(states("owner", { ...done, inspection_status: null })[1]).toBe("photos:current");
    expect(states("owner", done)).toEqual(["booked:done", "photos:done", "theirs:current", "mine:upcoming", "starts:upcoming"]);
    expect(states("owner", { ...done, renter_confirmed_at: "t" })).toEqual([
      "booked:done", "photos:done", "theirs:done", "mine:current", "starts:upcoming",
    ]);
  });
  it("says when confirming opens if the rental has not started", () => {
    const steps = handoverSteps({ start_date: "2026-10-25", handover_state: done }, "renter", TODAY);
    expect(steps.find((step) => step.key === "mine")?.detail).toMatch(/^From /);
  });
});

describe("handoverConfirmed", () => {
  it("is true once either side has confirmed, and only then", () => {
    expect(handoverConfirmed({ handover_state: done })).toBe(false);
    expect(handoverConfirmed({ handover_state: null })).toBe(false);
    expect(handoverConfirmed({ handover_state: { ...done, renter_confirmed_at: "t" } })).toBe(true);
    expect(handoverConfirmed({ handover_state: { ...done, owner_confirmed_at: "t" } })).toBe(true);
  });
});

describe("cancelBlockedReason", () => {
  const confirmed = (overrides = {}) => ({ status: "CONFIRMED" as const, start_date: "2026-10-25", handover_state: done, ...overrides });
  it("allows cancelling before the start date with nothing confirmed", () => {
    expect(cancelBlockedReason(confirmed(), TODAY)).toBeNull();
  });
  it("blocks it from the start date, even with nothing confirmed", () => {
    expect(cancelBlockedReason(confirmed({ start_date: TODAY }), TODAY)).toMatch(/start date/);
    expect(cancelBlockedReason(confirmed({ start_date: "2026-10-01" }), TODAY)).toMatch(/start date/);
  });
  it("blocks it once either side has confirmed the handover", () => {
    const state = { ...done, owner_confirmed_at: "t" };
    expect(cancelBlockedReason(confirmed({ handover_state: state }), TODAY)).toMatch(/handover has been confirmed/);
  });
  it("leaves other statuses to the server's own rules", () => {
    expect(cancelBlockedReason(confirmed({ status: "PENDING", start_date: TODAY }), TODAY)).toBeNull();
  });
});
