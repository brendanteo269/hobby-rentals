/**
 * S3-21: reporting a listing for an administrator to review. Mirrors
 * app/routers/reports.py; the reasons mirror public.listing_report_reasons().
 */

export type ListingReportReason =
  | "SCAM_OR_FRAUD"
  | "MISLEADING"
  | "PROHIBITED_ITEM"
  | "NOT_AVAILABLE"
  | "OFFENSIVE"
  | "OTHER";

/** In the order the form offers them. */
export const LISTING_REPORT_REASONS: { value: ListingReportReason; label: string }[] = [
  { value: "SCAM_OR_FRAUD", label: "It looks like a scam or fraud" },
  { value: "MISLEADING", label: "Misleading photos or description" },
  { value: "PROHIBITED_ITEM", label: "Prohibited or unsafe item" },
  { value: "NOT_AVAILABLE", label: "The item isn't really available" },
  { value: "OFFENSIVE", label: "Offensive or inappropriate content" },
  { value: "OTHER", label: "Something else" },
];

/** What a reporter is told back: never the evidence, which is for administrators. */
export type ListingReport = {
  id: string;
  listing_id: string;
  reason_code: ListingReportReason;
  status: "OPEN" | "DISMISSED" | "ACTIONED";
  created_at: string;
};
