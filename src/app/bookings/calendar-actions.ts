"use server";

import { getCalendarExport, type CalendarExport } from "@/lib/api/bookings";
import { BackendApiError } from "@/lib/api/client";

export type CalendarExportResult = { error: string } | { export: CalendarExport };

/** S4-16: the backend scopes the export to the signed-in member's own bookings for the role asked. */
export async function exportCalendar(role: "owner" | "renter"): Promise<CalendarExportResult> {
  try {
    return { export: await getCalendarExport(role) };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
}
