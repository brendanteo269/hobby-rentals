const LOCALE = "en-SG";

/** Built once: constructing an Intl instance per card in a grid is slow. */
const MONEY = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "SGD" });

/** Amounts cross the API as integer cents, as they do everywhere in this project. */
export function formatMoney(cents: number): string {
  return MONEY.format(cents / 100);
}

/**
 * Parses a dollar-amount form field into integer cents.
 *
 * The form collects dollars, because that is what an owner is pricing in, but
 * the API speaks cents everywhere. Rounding rather than truncating keeps
 * "10.005" from quietly becoming $10.00. Returns null for a blank field; a
 * malformed one becomes NaN, left for the caller to check.
 */
export function dollarsToCents(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return Math.round(Number(trimmed) * 100);
}

/**
 * The inverse of dollarsToCents, for pre-filling a money input from a stored
 * value: "10.00", not "$10.00" (that is formatMoney's job) and not "10"
 * (which a step="0.01" input would show but an owner would not have typed).
 */
export function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** "5 Sept 2026" — a calendar day, with no time of day implied. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "September 2026" — a coarse join date, not a precise timestamp. */
export function formatMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE, { month: "long", year: "numeric" });
}

/** "5 Sept 2026, 10:30 pm" — a precise timestamp, for a transaction ledger. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
