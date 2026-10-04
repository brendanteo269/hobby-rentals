import { describe, expect, it } from "vitest";
import {
  rentalDays,
  rentalDurationLimits,
  rentalQuote,
  rentalSubtotalCents,
  type Listing,
} from "@/lib/listings";

/**
 * These cover the one rule in the project that turns a rental length into
 * money. It serves two callers now - a listing's booking and a bundle's
 * package rate, which is priced exactly the same way - so a change here moves
 * both, and these are what say whether that was intended.
 */
const priced = (day: number | null, week: number | null) => ({
  price_per_day_cents: day,
  price_per_week_cents: week,
});

describe("rentalDays", () => {
  it("counts both ends of the range", () => {
    expect(rentalDays("2026-10-03", "2026-10-05")).toBe(3);
  });

  it("counts a single day as one", () => {
    expect(rentalDays("2026-10-03", "2026-10-03")).toBe(1);
  });

  it("is unaffected by the clocks going back", () => {
    // A naive hours-apart division reports 1.04 days across a DST boundary.
    expect(rentalDays("2026-10-24", "2026-10-26")).toBe(3);
  });
});

describe("rentalQuote", () => {
  it("multiplies a daily-only listing out", () => {
    expect(rentalQuote(priced(1000, null), 3)).toEqual({
      lines: [{ count: 3, unit: "day", rateCents: 1000, amountCents: 3000 }],
      totalCents: 3000,
    });
  });

  it("rounds a part week up on a weekly-only listing", () => {
    // Week granularity is what that owner chose to sell.
    const quote = rentalQuote(priced(null, 7000), 9)!;
    expect(quote.totalCents).toBe(14_000);
    expect(quote.lines[0]).toMatchObject({ count: 2, unit: "week" });
  });

  it("flags a part week charged as a whole one", () => {
    expect(rentalQuote(priced(null, 7000), 3)!.lines[0].cappedFromDays).toBe(3);
  });

  it("does not flag an exact number of weeks", () => {
    expect(rentalQuote(priced(null, 7000), 14)!.lines[0].cappedFromDays).toBeUndefined();
  });

  it("charges whole weeks weekly and the remainder daily", () => {
    const quote = rentalQuote(priced(1000, 5000), 9)!;
    expect(quote.lines).toEqual([
      { count: 1, unit: "week", rateCents: 5000, amountCents: 5000 },
      { count: 2, unit: "day", rateCents: 1000, amountCents: 2000 },
    ]);
    expect(quote.totalCents).toBe(7000);
  });

  it("caps a remainder at one more week when the daily rate would cost more", () => {
    // Six leftover days at $10 is $60; a week is $50, so the week wins.
    const quote = rentalQuote(priced(1000, 5000), 6)!;
    expect(quote.lines).toEqual([
      { count: 1, unit: "week", rateCents: 5000, amountCents: 5000, cappedFromDays: 6 },
    ]);
  });

  it("has no quote for a listing with neither rate", () => {
    expect(rentalQuote(priced(null, null), 3)).toBeNull();
  });

  it("has no quote for a rental of no days", () => {
    expect(rentalQuote(priced(1000, null), 0)).toBeNull();
  });

  it("always sums its own lines, at every length and shape", () => {
    for (const rates of [priced(1000, null), priced(null, 7000), priced(1000, 5000)]) {
      for (let days = 1; days <= 30; days += 1) {
        const quote = rentalQuote(rates, days)!;
        expect(quote.lines.reduce((sum, line) => sum + line.amountCents, 0)).toBe(quote.totalCents);
      }
    }
  });

  it("never charges more than a day at a time would, when both rates exist", () => {
    // The capping rule's whole point: a week is a ceiling on seven days.
    for (let days = 1; days <= 30; days += 1) {
      expect(rentalQuote(priced(1000, 5000), days)!.totalCents).toBeLessThanOrEqual(days * 1000);
    }
  });
});

describe("rentalSubtotalCents", () => {
  it("agrees with the itemised quote at every length and shape", () => {
    for (const rates of [priced(1000, null), priced(null, 7000), priced(1000, 5000)]) {
      for (let days = 1; days <= 30; days += 1) {
        expect(rentalSubtotalCents(rates, days)).toBe(rentalQuote(rates, days)!.totalCents);
      }
    }
  });

  it("is null when there is no rate to apply", () => {
    expect(rentalSubtotalCents(priced(null, null), 3)).toBeNull();
  });
});

describe("rentalDurationLimits", () => {
  const limits = (min: number | null, max: number | null) =>
    rentalDurationLimits({ min_rental_days: min, max_rental_days: max } as Listing);

  it("reads as a span when both bounds are set", () => {
    expect(limits(2, 7)).toBe("2–7 days");
  });

  it("collapses an exact-length rental to one figure", () => {
    expect(limits(3, 3)).toBe("3 days");
  });

  it("reads as open-ended with only a minimum", () => {
    expect(limits(2, null)).toBe("2 days or longer");
  });

  it("reads as a ceiling with only a maximum", () => {
    expect(limits(null, 5)).toBe("up to 5 days");
  });

  it("says nothing when any length is accepted", () => {
    expect(limits(null, null)).toBeNull();
  });

  it("gets the singular right", () => {
    expect(limits(1, 1)).toBe("1 day");
  });
});
