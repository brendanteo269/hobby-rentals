const LOCALE = "en-SG";

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
