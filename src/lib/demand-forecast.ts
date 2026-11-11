import { formatDayMonth } from "@/lib/format";

/** S6-06: the owner's demand forecast, as GET /analytics/demand-forecast returns it. */
export type ForecastLevel = "LOW" | "NORMAL" | "HIGH" | "NOT_ENOUGH_DATA";

export type HolidayKind = "SCHOOL_HOLIDAY" | "PUBLIC_HOLIDAY";

export type ForecastAttention = {
  listing_id: string;
  listing_name: string;
  category: string;
  week_start: string;
  /** The blocked days still ahead in that High week. */
  first_day: string;
  last_day: string;
  holiday: string | null;
  holiday_kind: HolidayKind | null;
};

export type DemandForecast = {
  model_version: string;
  /** Monday of the run shown; null before the first weekly run. */
  run_week: string | null;
  made_at: string | null;
  /** When forecasts started being kept, for the "still measuring" note. */
  measured_since: string | null;
  weeks: { week_start: string; holiday: string | null; holiday_kind: HolidayKind | null }[];
  categories: {
    category: string;
    levels: { week_start: string; level: ForecastLevel }[];
    accuracy: { scored_weeks: number; matched_weeks: number; shown: boolean };
  }[];
  listings: {
    listing_id: string;
    listing_name: string;
    category: string;
    unavailable: { week_start: string; first_day: string; last_day: string }[];
  }[];
  /** Listings unavailable during a High week, soonest first: what the owner can act on. */
  needs_attention: ForecastAttention[];
};

/** A forecast High week, as the price recommendation cites it. */
export type ForecastHighWeek = { week_start: string; holiday: string | null };

export const FORECAST_LEVEL_LABELS: Record<ForecastLevel, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  NOT_ENOUGH_DATA: "Not enough data",
};

export const HOLIDAY_KIND_LABELS: Record<HolidayKind, string> = {
  SCHOOL_HOLIDAY: "School break",
  PUBLIC_HOLIDAY: "Public holiday",
};

/** "8 Dec": a forecast week by its Monday. */
export function forecastWeekLabel(weekStart: string): string {
  return formatDayMonth(weekStart);
}

/** "27–29 Nov", "30 Nov – 2 Dec" across a month, or "27 Nov" for one day. */
export function forecastSpanLabel(first: string, last: string): string {
  if (first === last) return formatDayMonth(first);
  const [start, end] = [new Date(first), new Date(last)];
  if (start.getUTCMonth() === end.getUTCMonth()) return `${start.getUTCDate()}–${formatDayMonth(last)}`;
  return `${formatDayMonth(first)} – ${formatDayMonth(last)}`;
}

/** "23–29 Nov": a whole forecast week, Monday to Sunday. */
export function forecastWeekSpanLabel(weekStart: string): string {
  return forecastWeeksSpan(weekStart, weekStart);
}

/** "the weeks of 8 Dec and 22 Dec", for a sentence. */
export function forecastWeeksPhrase(weeks: string[]): string {
  const labels = weeks.map(forecastWeekLabel);
  if (labels.length === 1) return `the week of ${labels[0]}`;
  return `the weeks of ${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

export type ForecastWeek = DemandForecast["weeks"][number];

/** A run of consecutive weeks under one holiday, drawn as one band over the week columns. */
export type HolidayBand = { label: string; span: string; startIndex: number; length: number };

/**
 * One band per run of weeks sharing a holiday, so "School break" is said
 * once over the six weeks it covers rather than under each of them. A
 * school break is named by its kind; a public holiday by its own name.
 */
export function holidayBands(weeks: ForecastWeek[]): HolidayBand[] {
  const bands: HolidayBand[] = [];
  weeks.forEach((week, index) => {
    if (!week.holiday || !week.holiday_kind) return;
    const previous = bands[bands.length - 1];
    if (previous && previous.startIndex + previous.length === index && weeks[index - 1].holiday === week.holiday) {
      previous.length += 1;
      return;
    }
    bands.push({ label: week.holiday_kind === "SCHOOL_HOLIDAY" ? HOLIDAY_KIND_LABELS.SCHOOL_HOLIDAY : week.holiday, span: "", startIndex: index, length: 1 });
  });
  for (const band of bands) {
    band.span = forecastWeeksSpan(weeks[band.startIndex].week_start, weeks[band.startIndex + band.length - 1].week_start);
  }
  return bands;
}

function weekSunday(weekStart: string): string {
  const sunday = new Date(weekStart);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  return sunday.toISOString().slice(0, 10);
}

/** "16 Nov – 10 Jan": from the Monday of the first week to the Sunday of the last. */
export function forecastWeeksSpan(firstWeek: string, lastWeek: string): string {
  return forecastSpanLabel(firstWeek, weekSunday(lastWeek));
}

/** "10 Jan": the last day a forecast covers, the Sunday of its last week. */
export function forecastWeeksEnd(lastWeek: string): string {
  return formatDayMonth(weekSunday(lastWeek));
}
