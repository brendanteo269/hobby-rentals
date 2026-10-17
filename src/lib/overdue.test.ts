import { describe, expect, it } from "vitest";
import { daysOverdue, isOverdue, overdueFeeCents } from "@/lib/overdue";

const TODAY = new Date(2026, 9, 17); // 17 Oct 2026, local midnight

describe("isOverdue", () => {
  it("is true only while the item is still out past its return date", () => {
    expect(isOverdue({ overdue_since: "2026-10-15" })).toBe(true);
    expect(isOverdue({ overdue_since: null })).toBe(false);
  });
});

describe("daysOverdue", () => {
  it("counts the first late day as one", () => {
    expect(daysOverdue({ overdue_since: "2026-10-17" }, TODAY)).toBe(1);
  });

  it("counts every elapsed day since", () => {
    expect(daysOverdue({ overdue_since: "2026-10-14" }, TODAY)).toBe(4);
  });

  it("is zero for a rental that is not late", () => {
    expect(daysOverdue({ overdue_since: null }, TODAY)).toBe(0);
  });

  it("does not drift across a daylight-saving-style clock change", () => {
    // Parsed at local midnight on both ends, so the difference stays whole.
    expect(daysOverdue({ overdue_since: "2026-03-28" }, new Date(2026, 2, 30))).toBe(3);
  });
});

describe("overdueFeeCents", () => {
  it("returns null for a rental returned on time, so the line is omitted", () => {
    expect(overdueFeeCents({ overdue_since: null, overdue_fee_cents: 0, overdue_arrears_cents: 0 })).toBeNull();
  });

  it("reports the running fee while the item is out", () => {
    expect(
      overdueFeeCents({ overdue_since: "2026-10-14", overdue_fee_cents: 4_000, overdue_arrears_cents: 0 }),
    ).toBe(4_000);
  });

  it("still reports a frozen charge after the item is back", () => {
    expect(
      overdueFeeCents({ overdue_since: null, overdue_fee_cents: 4_000, overdue_arrears_cents: 1_500 }),
    ).toBe(4_000);
  });

  it("shows zero rather than nothing on the first late day before any fee", () => {
    // A listing with no rate accrues nothing, but the rental is still late.
    expect(overdueFeeCents({ overdue_since: "2026-10-17", overdue_fee_cents: 0, overdue_arrears_cents: 0 })).toBe(0);
  });
});
