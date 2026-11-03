import "server-only";

import { backendRequest } from "@/lib/api/client";
import type { AwayClash, AwayPeriod } from "@/lib/away";

export type AwaySaveResult = AwayPeriod & { declined: string[]; not_declined: string[] };

/** The owner's current or upcoming away period, or null when away mode is off. */
export async function getAway(): Promise<AwayPeriod | null> {
  return (await backendRequest<{ period: AwayPeriod | null }>("/profile/away")).period;
}

/** S5-15 Scenario 3: the bookings and requests a range would land on, before saving. */
export function previewAway(start_date: string, end_date: string) {
  return backendRequest<{ clashes: AwayClash[] }>("/profile/away/preview", {
    method: "POST",
    body: JSON.stringify({ start_date, end_date }),
  });
}

/**
 * Saves the period. `acknowledged_ids` must be every clash id the owner was
 * shown; a 409 with code CLASHES_CHANGED means the list moved since.
 */
export function saveAway(body: {
  start_date: string;
  end_date: string;
  message: string;
  acknowledged_ids: string[];
  decline_ids: string[];
}) {
  return backendRequest<AwaySaveResult>("/profile/away", { method: "PUT", body: JSON.stringify(body) });
}

/** Ends away mode now, or cancels a period that has not started. */
export function endAway() {
  return backendRequest<void>("/profile/away", { method: "DELETE" });
}
