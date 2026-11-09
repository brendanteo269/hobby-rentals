import { describe, expect, it } from "vitest";
import { RISK_LEVEL_GUIDANCE, RISK_LEVEL_LABELS, isOpenOffer, type RiskLevel } from "@/lib/booking-risk";

const LEVELS: RiskLevel[] = ["LOW", "MEDIUM", "HIGH"];

describe("risk wording", () => {
  it("has a label and a line of guidance for every level", () => {
    // A level with no words is a blank panel beside a booking decision.
    for (const level of LEVELS) {
      expect(RISK_LEVEL_LABELS[level]).toBeTruthy();
      expect(RISK_LEVEL_GUIDANCE[level]).toBeTruthy();
    }
  });

  it("never tells the owner outright to decline", () => {
    // The rating is a prompt to look closer, not a verdict: a renter
    // wrongly rated High is someone's booking lost.
    expect(RISK_LEVEL_GUIDANCE.HIGH.toLowerCase()).toContain("consider");
    for (const level of LEVELS) {
      expect(RISK_LEVEL_GUIDANCE[level]).not.toMatch(/^Decline/i);
    }
  });
});

describe("isOpenOffer", () => {
  const offer = {
    id: "o1", booking_id: "b1", extra_deposit_cents: 10_000,
    respond_by: "2026-11-10T00:00:00Z", created_at: "2026-11-08T00:00:00Z",
    responded_at: null,
  };

  it("is open only while it is pending", () => {
    expect(isOpenOffer({ ...offer, status: "PENDING" })).toBe(true);
  });

  it("is closed once it has been answered or has lapsed", () => {
    for (const status of ["ACCEPTED", "DECLINED", "EXPIRED"] as const) {
      expect(isOpenOffer({ ...offer, status })).toBe(false);
    }
  });

  it("is closed when there is no offer at all", () => {
    // Both shapes the API can return, so a booking that never had one does
    // not render an empty panel.
    expect(isOpenOffer(null)).toBe(false);
    expect(isOpenOffer(undefined)).toBe(false);
  });
});
