import { describe, expect, it } from "vitest";
import { promoCodeState, promoDiscountLabel, promoUsesLeft, type PromoCode } from "@/lib/promo-codes";

function code(overrides: Partial<PromoCode> = {}): PromoCode {
  return {
    id: "c1", listing_id: "l1", code: "SUMMER10", discount_type: "PERCENT",
    percent_off: 10, amount_off_cents: null, starts_on: "2026-11-01", ends_on: "2026-12-01",
    usage_limit: null, times_used: 0, created_at: "2026-11-01T00:00:00Z",
    ...overrides,
  };
}

describe("promoDiscountLabel", () => {
  it("reads a percentage as a percentage", () => {
    expect(promoDiscountLabel(code({ percent_off: 15 }))).toBe("15% off");
  });

  it("reads a fixed amount in dollars", () => {
    expect(promoDiscountLabel(code({ discount_type: "FIXED", percent_off: null, amount_off_cents: 1500 })))
      .toBe("S$15.00 off");
  });
});

describe("promoUsesLeft", () => {
  it("is null when there is no limit, which is not the same as none left", () => {
    expect(promoUsesLeft(code({ usage_limit: null, times_used: 9 }))).toBeNull();
  });

  it("counts down as the code is used", () => {
    expect(promoUsesLeft(code({ usage_limit: 10, times_used: 4 }))).toBe(6);
  });

  it("never reads as negative, however the counts end up", () => {
    expect(promoUsesLeft(code({ usage_limit: 2, times_used: 5 }))).toBe(0);
  });
});

describe("promoCodeState", () => {
  const window = { starts_on: "2026-11-01", ends_on: "2026-11-30", usage_limit: null, times_used: 0 };

  it("is running inside its window", () => {
    expect(promoCodeState(window, "2026-11-15")).toBe("RUNNING");
  });

  it("is running on its first and last day, which are inclusive", () => {
    expect(promoCodeState(window, "2026-11-01")).toBe("RUNNING");
    expect(promoCodeState(window, "2026-11-30")).toBe("RUNNING");
  });

  it("has not started before its first day", () => {
    expect(promoCodeState(window, "2026-10-31")).toBe("SCHEDULED");
  });

  it("is expired after its last day", () => {
    expect(promoCodeState(window, "2026-12-01")).toBe("EXPIRED");
  });

  it("reads as fully claimed even inside its window", () => {
    // The more useful answer: the dates are not why it stopped working.
    expect(promoCodeState({ ...window, usage_limit: 5, times_used: 5 }, "2026-11-15")).toBe("USED_UP");
  });

  it("is not fully claimed when it has no limit, however often it was used", () => {
    expect(promoCodeState({ ...window, usage_limit: null, times_used: 99 }, "2026-11-15")).toBe("RUNNING");
  });
});
