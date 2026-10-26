"use server";

import { revalidatePath } from "next/cache";
import { cancelAvailabilityAlert, setAvailabilityAlert } from "@/lib/api/availability-alerts";
import { BackendApiError } from "@/lib/api/client";
import type { AvailabilityAlert } from "@/lib/availability-alerts";

export type AlertResult = { error: string } | { alert: AvailabilityAlert };

/**
 * S4-07 Scenario 1: watch a listing's blocked-out dates.
 *
 * Revalidates the layout as well as the listing: an alert is answered by a
 * notification, so the header's unread count is part of what changed.
 */
export async function setAlert(
  listingId: string,
  startDate: string,
  endDate: string,
): Promise<AlertResult> {
  try {
    const alert = await setAvailabilityAlert(listingId, startDate, endDate);
    revalidatePath("/", "layout");
    return { alert };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
}

/** S4-07 Scenario 3: stop watching, and stop being told. */
export async function cancelAlert(alertId: string): Promise<AlertResult> {
  try {
    const alert = await cancelAvailabilityAlert(alertId);
    revalidatePath("/", "layout");
    return { alert };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
}
