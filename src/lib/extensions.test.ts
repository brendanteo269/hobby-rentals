import { describe, expect, it } from "vitest";
import type { Booking } from "@/lib/bookings";
import { canRequestExtension, extensionLines, type ExtensionQuote, type ExtensionRequest } from "@/lib/extensions";

function quote(overrides: Partial<ExtensionQuote> = {}): ExtensionQuote {
  return {
    additional_days: 3,
    previous_end_date: "2026-10-04",
    new_end_date: "2026-10-07",
    rental_subtotal_delta_cents: 3_000,
    platform_fee_delta_cents: 150,
    protection_fee_delta_cents: 0,
    total_delta_cents: 3_150,
    ...overrides,
  };
}

function pending(): ExtensionRequest {
  return {
    ...quote(),
    id: "e1",
    booking_id: "b1",
    requested_by: "r1",
    status: "PENDING",
    created_at: "2026-10-03T00:00:00+00:00",
  };
}

type Extendable = Pick<Booking, "status" | "pending_extension">;

describe("canRequestExtension", () => {
  it("offers the extension only on a rental in progress", () => {
    expect(canRequestExtension({ status: "ACTIVE" } as Extendable)).toBe(true);
  });

  it.each(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "DECLINED", "EXPIRED"] as const)(
    "does not offer it on a %s booking",
    (status) => {
      expect(canRequestExtension({ status } as Extendable)).toBe(false);
    },
  );

  it("does not offer a second request while one is still with the owner", () => {
    expect(canRequestExtension({ status: "ACTIVE", pending_extension: pending() })).toBe(false);
  });
});

describe("extensionLines", () => {
  it("itemises the extra days, the fee and the total", () => {
    expect(extensionLines(quote())).toEqual([
      { label: "3 extra days", cents: 3_000 },
      { label: "Platform fee", cents: 150 },
      { label: "Total to hold", cents: 3_150, tone: "total" },
    ]);
  });

  it("says day, not days, for a one-day extension", () => {
    expect(extensionLines(quote({ additional_days: 1 }))[0].label).toBe("1 extra day");
  });

  it("omits damage protection when the booking never opted in", () => {
    expect(extensionLines(quote()).map((line) => line.label)).not.toContain("Damage protection");
  });

  it("shows damage protection when the extra days add to its fee", () => {
    const lines = extensionLines(quote({ protection_fee_delta_cents: 50, total_delta_cents: 3_200 }));

    expect(lines.map((line) => line.label)).toContain("Damage protection");
    // The deposit is never re-charged, so the total is only the three lines above it.
    expect(lines.at(-1)).toEqual({ label: "Total to hold", cents: 3_200, tone: "total" });
  });
});
