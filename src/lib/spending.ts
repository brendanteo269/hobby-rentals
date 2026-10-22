import { rentalRowId } from "@/lib/rentals";
import type { TransactionType, WalletTransaction } from "@/lib/wallet";

/** The Spending tab's periods, which are also the legal values of its `?period=` parameter. */
export type SpendingPeriod = "30d" | "3m" | "12m" | "all";

export const SPENDING_PERIODS: readonly { value: SpendingPeriod; label: string }[] = [
  { value: "30d", label: "Last 30 days" },
  { value: "3m", label: "Last 3 months" },
  { value: "12m", label: "Last 12 months" },
  { value: "all", label: "All time" },
];

export function isSpendingPeriod(value: string | undefined): value is SpendingPeriod {
  return SPENDING_PERIODS.some((period) => period.value === value);
}

/**
 * Money that left the renter for good, by ledger type. A hold is not spending
 * - it comes back unless something is taken from it - so ESCROW_HOLD is
 * absent; what a settlement takes from it is recorded as one of these.
 */
const SPEND_LABELS: Partial<Record<TransactionType, string>> = {
  RENTAL_CHARGE: "Rental",
  CANCELLATION_FEE: "Cancellation fee",
  DAMAGE_DEDUCTION: "Damage deducted from deposit",
  OVERDUE_SETTLEMENT: "Late return fee",
};

/** Money that came back to the renter's available balance: released holds and refunds. */
const RETURN_LABELS: Partial<Record<TransactionType, string>> = {
  ESCROW_RELEASE: "Released to your wallet",
  REFUND: "Refund",
};

export type SpendingLine = { id: string; label: string; date: string; /** Positive: spent. Negative: came back. */ cents: number };

/** One rental's money, with what it cost and what came back. */
export type RentalSpend = {
  key: string;
  name: string | null;
  startDate: string | null;
  endDate: string | null;
  /** The rental's row on the Bookings tab, when the ledger names one. */
  rowId: ReturnType<typeof rentalRowId> | null;
  spentCents: number;
  lines: SpendingLine[];
};

export type RenterSpending = {
  spentCents: number;
  returnedCents: number;
  /** Rentals with any money movement in the period, most recent first. */
  rentals: RentalSpend[];
};

function periodStart(period: SpendingPeriod, now: Date): Date | null {
  if (period === "all") return null;
  const start = new Date(now);
  if (period === "30d") start.setDate(start.getDate() - 30);
  else start.setMonth(start.getMonth() - (period === "3m" ? 3 : 12));
  return start;
}

/**
 * Sums the renter's side of the ledger over a period and groups it by rental.
 * The ledger stores the renter's charges as negative amounts; they are flipped
 * here so "spent" reads as a positive figure. OVERDUE_SETTLEMENT is credited
 * to the owner as a positive amount, so only the negative side counts.
 */
export function renterSpending(transactions: WalletTransaction[], period: SpendingPeriod, now: Date = new Date()): RenterSpending {
  const start = periodStart(period, now);
  const byRental = new Map<string, RentalSpend>();
  let spentCents = 0;
  let returnedCents = 0;

  for (const tx of transactions) {
    if (start && new Date(tx.date) < start) continue;
    const spendLabel = tx.amountCents < 0 ? SPEND_LABELS[tx.type] : undefined;
    const returnLabel = tx.amountCents > 0 ? RETURN_LABELS[tx.type] : undefined;
    const label = spendLabel ?? returnLabel;
    if (!label) continue;

    // A refund with no booking behind it still belongs in the totals; it just
    // has no rental to sit under, so it gets a group of its own.
    const ref = tx.bookingReference;
    const key = ref?.bookingId ?? ref?.bundleBookingId ?? tx.id;
    const rental = byRental.get(key) ?? {
      key,
      name: ref?.name ?? null,
      startDate: ref?.startDate ?? null,
      endDate: ref?.endDate ?? null,
      rowId: ref?.bundleBookingId
        ? rentalRowId("BUNDLE", ref.bundleBookingId)
        : ref?.bookingId
          ? rentalRowId("BOOKING", ref.bookingId)
          : null,
      spentCents: 0,
      lines: [],
    };
    byRental.set(key, rental);

    const cents = -tx.amountCents;
    rental.lines.push({ id: tx.id, label, date: tx.date, cents });
    if (spendLabel) {
      rental.spentCents += cents;
      spentCents += cents;
    } else {
      returnedCents += tx.amountCents;
    }
  }

  const latest = (rental: RentalSpend) => rental.lines.reduce((max, line) => (line.date > max ? line.date : max), "");
  const rentals = [...byRental.values()].sort((a, b) => latest(b).localeCompare(latest(a)));
  for (const rental of rentals) rental.lines.sort((a, b) => a.date.localeCompare(b.date));
  return { spentCents, returnedCents, rentals };
}
