/**
 * S5-17: an owner's usual reply time, as the API bands it
 * (app/response_time_service.py). Renters see the band, never an exact time.
 * Absent when the owner has too little history to say (Scenario 4).
 */

export type ResponseTimeBand = "HOUR" | "FEW_HOURS" | "DAY" | "FEW_DAYS";

export const RESPONSE_TIME_LABELS: Record<ResponseTimeBand, string> = {
  HOUR: "Usually replies within an hour",
  FEW_HOURS: "Usually replies within a few hours",
  DAY: "Usually replies within a day",
  FEW_DAYS: "Usually replies within a few days",
};

/** The label for a band, or null when there is none or it is one this build does not know. */
export function responseTimeLabel(band?: string | null): string | null {
  return band && band in RESPONSE_TIME_LABELS ? RESPONSE_TIME_LABELS[band as ResponseTimeBand] : null;
}
