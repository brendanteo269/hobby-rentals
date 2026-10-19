import { createAdminClient } from "@/lib/supabase/admin";

/**
 * S3-21: members' reports on listings, for an administrator to decide.
 * Reporting happens in the API; deciding calls resolve_listing_report, which
 * closes the report (and, to deactivate, takes the listing down and closes
 * every open report on it) and writes the audit entry in one transaction.
 */

export type ReportStatus = "OPEN" | "DISMISSED" | "ACTIONED";

/** Mirrors the reasons members choose from (public.listing_report_reasons()). */
export const LISTING_REPORT_REASON_LABELS: Record<string, string> = {
  SCAM_OR_FRAUD: "Scam or fraud",
  MISLEADING: "Misleading photos or description",
  PROHIBITED_ITEM: "Prohibited or unsafe item",
  NOT_AVAILABLE: "Item not really available",
  OFFENSIVE: "Offensive or inappropriate",
  OTHER: "Other",
};

export const REPORT_STATUS: Record<ReportStatus, { label: string; tone: "warning" | "neutral" | "critical" }> = {
  OPEN: { label: "Awaiting review", tone: "warning" },
  DISMISSED: { label: "Dismissed", tone: "neutral" },
  ACTIONED: { label: "Listing deactivated", tone: "critical" },
};

export type QueuedListingReport = {
  id: string;
  listing_id: string;
  reason_code: string;
  created_at: string;
  listing: { name: string; status: string; owner_id: string };
};

/** Open listing reports, oldest first so the longest wait leads. */
export async function listOpenListingReports(): Promise<{ reports: QueuedListingReport[]; error: string | null }> {
  // ponytail: first 100 only; paginate if the queue ever gets that long (S3-23's queue will).
  const { data, error } = await createAdminClient()
    .from("reports")
    .select("id, listing_id, reason_code, created_at, listing:listings!inner(name, status, owner_id)")
    .eq("kind", "LISTING")
    .eq("status", "OPEN")
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) {
    console.error("Listing report queue failed:", error.message);
    return { reports: [], error: "Couldn't load reported listings." };
  }
  return { reports: (data ?? []) as unknown as QueuedListingReport[], error: null };
}

export type ConversationMessage = {
  conversation_id: string;
  thread: "LISTING" | "BOOKING";
  from: "REPORTER" | "OWNER";
  body: string;
  sent_at: string;
  attachments: number;
};

export type ListingReport = {
  id: string;
  reporter_id: string;
  reporter_name: string | null;
  booking_id: string | null;
  reason_code: string;
  explanation: string | null;
  status: ReportStatus;
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
  evidence: {
    captured_at?: string;
    listing?: { name?: string; status?: string; description?: string };
    booking?: { id: string; status: string; start_date: string; end_date: string } | null;
    conversation?: ConversationMessage[];
  };
};

/** Every report on one listing, open first then newest, with the reporter's name. */
export async function getListingReports(listingId: string): Promise<ListingReport[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("reports")
    .select("id, reporter_id, booking_id, reason_code, explanation, status, resolution_note, resolved_at, created_at, evidence")
    .eq("kind", "LISTING")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Listing reports failed:", error.message);
    return [];
  }
  const rows = data ?? [];
  const reporterIds = [...new Set(rows.map((row) => row.reporter_id as string))];
  const { data: profiles } = reporterIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", reporterIds)
    : { data: [] };
  const names = new Map((profiles ?? []).map((p) => [p.id as string, p.display_name as string | null]));
  return rows
    .map((row) => ({ ...(row as Omit<ListingReport, "reporter_name">), reporter_name: names.get(row.reporter_id) ?? null }))
    .sort((a, b) => Number(b.status === "OPEN") - Number(a.status === "OPEN"));
}

export type ReportDecision = "DISMISS" | "DEACTIVATE";

/** The decision, with the mandatory reason; refusals come back as the database's message. */
export async function resolveListingReport(
  reportId: string,
  decision: ReportDecision,
  reason: string,
): Promise<{ error: string | null }> {
  const { error } = await createAdminClient().rpc("resolve_listing_report", {
    p_report_id: reportId,
    p_action: decision,
    p_note: reason,
  });
  return { error: error ? error.message : null };
}
