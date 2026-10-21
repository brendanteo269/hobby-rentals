import { adminApiKey, apiUrl } from "@/lib/env";
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

/** The same statuses for a user report (S3-22): "actioned" there means the claim was upheld and sent to the person reported. */
export const USER_REPORT_STATUS: Record<ReportStatus, { label: string; tone: "warning" | "neutral" | "critical" }> = {
  OPEN: { label: "Awaiting review", tone: "warning" },
  DISMISSED: { label: "Dismissed", tone: "neutral" },
  ACTIONED: { label: "User warned", tone: "critical" },
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
  decision_by: "ADMIN" | "AI";
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
    .select("id, reporter_id, booking_id, reason_code, explanation, status, resolution_note, resolved_at, decision_by, created_at, evidence")
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


// --- S3-22: reports on users ------------------------------------------------------------

/** Mirrors the reasons members choose from (public.user_report_reasons()). */
export const USER_REPORT_REASON_LABELS: Record<string, string> = {
  HARASSMENT: "Harassment or abuse",
  THREATS: "Threats",
  SCAM_OR_FRAUD: "Scam or fraud",
  INAPPROPRIATE_CONTENT: "Inappropriate content",
  SPAM: "Spam",
  OTHER: "Something else",
};

export type ReportParty = { id: string; display_name: string | null; role: "RENTER" | "OWNER" };

type ReportBooking = {
  id: string;
  status: string;
  start_date: string;
  end_date: string;
  listing_id: string;
  listing_name: string | null;
};

/** One row of the user-report queue, without the message bundle. */
export type UserReportSummary = {
  id: string;
  reason_code: string;
  status: ReportStatus;
  created_at: string;
  reporter: ReportParty;
  reported: ReportParty;
  booking: ReportBooking;
  message_count: number;
};

/** A user report with its evidence bundle, as GET /admin/user-reports/{id} answers. */
export type UserReportDetail = {
  id: string;
  reason_code: string;
  explanation: string;
  status: ReportStatus;
  created_at: string;
  /** When it was decided; null while it awaits an administrator. */
  resolved_at: string | null;
  /** The administrator's own note: never shown to either member. */
  resolution_note: string | null;
  /** Who decided it; AI means it was dismissed without a person, and can be reopened. */
  decision_by: "ADMIN" | "AI" | null;
  captured_at: string | null;
  reporter: ReportParty;
  reported: ReportParty;
  booking: ReportBooking;
  conversation_id: string;
  messages: {
    id: string;
    from: "REPORTER" | "REPORTED";
    body: string;
    sent_at: string;
    /** Short-lived signed URLs: attachments are never publicly readable. */
    attachment_urls: string[];
  }[];
};

/**
 * Through the API rather than Supabase, so attachment keys can be signed for
 * viewing. Call only behind requirePortalSession().
 */
export async function listOpenUserReports(): Promise<{ reports: UserReportSummary[]; error: string | null }> {
  try {
    const response = await fetch(`${apiUrl()}/admin/user-reports`, {
      headers: { "X-Admin-Key": adminApiKey() },
      cache: "no-store",
    });
    if (!response.ok) return { reports: [], error: "Could not load user reports." };
    return { reports: await response.json(), error: null };
  } catch (error) {
    console.error("User report queue failed:", error);
    return { reports: [], error: "Could not load user reports." };
  }
}

/** Null when there is no such report. */
export async function getUserReport(id: string): Promise<UserReportDetail | null> {
  const response = await fetch(`${apiUrl()}/admin/user-reports/${encodeURIComponent(id)}`, {
    headers: { "X-Admin-Key": adminApiKey() },
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`User report lookup failed: ${response.status}`);
  return response.json();
}
