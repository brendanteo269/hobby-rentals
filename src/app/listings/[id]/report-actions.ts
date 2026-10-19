"use server";

import { BackendApiError } from "@/lib/api/client";
import { reportListing } from "@/lib/api/listings";
import type { ListingReportReason } from "@/lib/reports";

export type ReportListingResult = { error: string; code?: string } | { reported: true };

/** S3-21: a member reports a listing; the owner is told it is under review, not by whom. */
export async function submitListingReport(
  listingId: string,
  reason: ListingReportReason,
  explanation: string,
): Promise<ReportListingResult> {
  try {
    await reportListing(listingId, reason, explanation.trim() || null);
    return { reported: true };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message, code: error.code };
    throw error;
  }
}
