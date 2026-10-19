"use server";

import { revalidatePath } from "next/cache";
import { requirePortalSession } from "@/lib/admin";
import { resolveListingReport, type ReportDecision } from "@/lib/reports";
import { ROUTES } from "@/lib/routes";

export type ReportDecisionState = { error?: string; success?: string } | undefined;

/**
 * S3-21: an administrator's decision on a listing report - dismiss it, or
 * deactivate the listing (which closes every open report on it and tells the
 * owner, via S2-23). A reason is required either way; the audit entry is
 * written by the database in the same transaction.
 */
export async function decideListingReportAction(
  _prev: ReportDecisionState,
  formData: FormData,
): Promise<ReportDecisionState> {
  await requirePortalSession();
  const reportId = String(formData.get("report_id") ?? "");
  const listingId = String(formData.get("listing_id") ?? "");
  const decision = String(formData.get("decision") ?? "") as ReportDecision;
  const reason = String(formData.get("reason") ?? "").trim();

  if (decision !== "DISMISS" && decision !== "DEACTIVATE") return { error: "Choose to dismiss or deactivate." };
  if (!reason) return { error: "A reason is required." };

  const { error } = await resolveListingReport(reportId, decision, reason);
  if (error) return { error };

  revalidatePath(ROUTES.listing(listingId));
  revalidatePath(ROUTES.listings);
  return {
    success: decision === "DISMISS" ? "Report dismissed." : "Listing deactivated, the owner told, and its reports closed.",
  };
}
