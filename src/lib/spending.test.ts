import { describe, expect, it } from "vitest";
import { renterSpending } from "@/lib/spending";
import type { TransactionType, WalletTransaction } from "@/lib/wallet";

const ref = { bookingId: "b1", bundleBookingId: null, name: "Tent", startDate: "2026-10-01", endDate: "2026-10-03" };

function tx(id: string, type: TransactionType, amountCents: number, date: string, bookingReference: WalletTransaction["bookingReference"] = ref): WalletTransaction {
  return { id, type, description: "", amountCents, date, status: "COMPLETED", bookingReference };
}

const now = new Date("2026-10-20T00:00:00Z");

describe("renterSpending", () => {
  it("counts charges as spending and released holds as money back, ignoring the hold itself", () => {
    const result = renterSpending(
      [
        tx("h", "ESCROW_HOLD", -9000, "2026-10-01T00:00:00Z"),
        tx("c", "RENTAL_CHARGE", -4000, "2026-10-05T00:00:00Z"),
        tx("d", "DAMAGE_DEDUCTION", -1000, "2026-10-05T00:00:00Z"),
        tx("r", "ESCROW_RELEASE", 4000, "2026-10-05T00:00:00Z"),
      ],
      "all",
      now,
    );

    expect(result.spentCents).toBe(5000);
    expect(result.returnedCents).toBe(4000);
    expect(result.rentals).toHaveLength(1);
    expect(result.rentals[0]).toMatchObject({ name: "Tent", rowId: "booking-b1", spentCents: 5000 });
    expect(result.rentals[0].lines.map((line) => line.cents)).toEqual([4000, 1000, -4000]);
  });

  it("leaves out the owner's side of a late fee", () => {
    const result = renterSpending([tx("o", "OVERDUE_SETTLEMENT", 1500, "2026-10-05T00:00:00Z")], "all", now);
    expect(result).toEqual({ spentCents: 0, returnedCents: 0, rentals: [] });
  });

  it("only counts the chosen period", () => {
    const result = renterSpending(
      [tx("old", "RENTAL_CHARGE", -3000, "2026-08-01T00:00:00Z"), tx("new", "RENTAL_CHARGE", -2000, "2026-10-10T00:00:00Z")],
      "30d",
      now,
    );
    expect(result.spentCents).toBe(2000);
  });

  it("groups a bundle's money under its own row", () => {
    const bundleRef = { ...ref, bookingId: null, bundleBookingId: "bb1", name: "Camping set" };
    const [rental] = renterSpending([tx("c", "CANCELLATION_FEE", -500, "2026-10-10T00:00:00Z", bundleRef)], "all", now).rentals;
    expect(rental).toMatchObject({ rowId: "bundle-booking-bb1", spentCents: 500 });
  });
});
