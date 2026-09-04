const DATE = new Intl.DateTimeFormat("en-SG", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const DATE_TIME = new Intl.DateTimeFormat("en-SG", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Formatters are built once: constructing an Intl instance per row is slow. */
export function formatDate(value: string | null, fallback = "—"): string {
  return value ? DATE.format(new Date(value)) : fallback;
}

export function formatDateTime(value: string | null, fallback = "—"): string {
  return value ? DATE_TIME.format(new Date(value)) : fallback;
}

/** Shortened account id, for places where the full uuid would dominate. */
export function shortId(id: string): string {
  return id.slice(0, 8);
}
