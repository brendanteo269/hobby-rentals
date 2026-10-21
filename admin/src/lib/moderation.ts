import { createAdminClient } from "@/lib/supabase/admin";
import type { StatusTone } from "@/lib/users";

/**
 * S3-23: the moderation queue - listing reports (S3-21) and user reports
 * (S3-22) in one place. Priority and case age are worked out in the database
 * (admin_moderation_queue), not stored, so they never go stale.
 */

export type ReportKind = "LISTING" | "USER";
export type QueueStatus = "OPEN" | "DECIDED";
export type Priority = "HIGH" | "MEDIUM" | "LOW";
export type ReportDecisionKind = "DISMISS" | "DEACTIVATE" | "WARN";
export type AiSuggestion = "DISMISS" | "WARN" | "DEACTIVATE" | "NEEDS_HUMAN";

export const PAGE_SIZE = 25;

/** Mirror public.moderation_strike_limit() and moderation_suspension_days(), which enforce them. */
export const STRIKE_LIMIT = 3;
export const SUSPENSION_DAYS = 30;

export const KIND_LABELS: Record<ReportKind, string> = { LISTING: "Listing", USER: "User" };

export const PRIORITY: Record<Priority, { label: string; tone: StatusTone }> = {
  HIGH: { label: "High", tone: "critical" },
  MEDIUM: { label: "Medium", tone: "warning" },
  LOW: { label: "Low", tone: "neutral" },
};

/** What was decided, in the administrator's words. */
export const DECISION_LABELS: Record<ReportDecisionKind, string> = {
  DISMISS: "Dismissed",
  DEACTIVATE: "Listing deactivated",
  WARN: "Acknowledged, strike added",
};

/** The filters the queue offers, in the order the dropdowns list them. */
export const STATUS_OPTIONS: { value: QueueStatus; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "DECIDED", label: "Decided" },
];
export const KIND_OPTIONS: { value: ReportKind; label: string }[] = [
  { value: "LISTING", label: "Listing reports" },
  { value: "USER", label: "User reports" },
];
export const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

/** One row of admin_moderation_queue. */
export type QueuedReport = {
  id: string;
  kind: ReportKind;
  reason_code: string;
  priority: Priority;
  status: "OPEN" | "DISMISSED" | "ACTIONED";
  decision: ReportDecisionKind | null;
  /** Who made the decision: an administrator, or the AI dismissing a clearly baseless report. */
  decision_by: "ADMIN" | "AI";
  reporter_id: string;
  reporter_name: string | null;
  reported_user_id: string;
  reported_name: string | null;
  listing_id: string | null;
  listing_name: string | null;
  booking_id: string | null;
  created_at: string;
  resolved_at: string | null;
  case_age_seconds: number;
  ai_status: "PROCESSING" | "DONE" | "FAILED" | null;
  ai_suggestion: AiSuggestion | null;
  ai_severity: number | null;
  ai_confidence: number | null;
  total_count: number;
};

/** What narrows the queue. An empty list, or no search, means any. */
export type QueueFilters = {
  statuses: QueueStatus[];
  kinds: ReportKind[];
  priorities: Priority[];
  search: string;
};

/**
 * One page of the queue, filtered. Refusals are surfaced rather than thrown so
 * the page can stay up. Call only behind requirePortalSession(): the client
 * carries the secret key.
 */
export async function getModerationQueue(
  filters: QueueFilters,
  page = 1,
): Promise<{ reports: QueuedReport[]; total: number; error: string | null }> {
  const { data, error } = await createAdminClient().rpc("admin_moderation_queue", {
    p_statuses: filters.statuses,
    p_kinds: filters.kinds,
    p_priorities: filters.priorities,
    p_search: filters.search,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  if (error) {
    console.error("Moderation queue failed:", error.message);
    return { reports: [], total: 0, error: "Could not load the moderation queue." };
  }
  const rows = (data ?? []) as QueuedReport[];
  return { reports: rows, total: rows[0]?.total_count ?? 0, error: null };
}

/** A report's kind and listing, so one page can open either. Null for an unknown or malformed id. */
export async function getReportKind(id: string): Promise<{ kind: ReportKind; listing_id: string | null } | null> {
  const { data, error } = await createAdminClient().from("reports").select("kind, listing_id").eq("id", id).maybeSingle();
  if (error) {
    console.error("Report lookup failed:", error.message);
    return null;
  }
  return data as { kind: ReportKind; listing_id: string | null } | null;
}

/** "3 days", "5 hours", "12 minutes": how long a case has been or was open. */
export function formatCaseAge(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${Math.max(minutes, 1)} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  return `${days} days`;
}

export type UserModeration = {
  strike_limit: number;
  strikes: { id: string; report_id: string; reason: string; created_at: string }[];
  suspension: { id: string; report_id: string; reason: string; starts_at: string; ends_at: string } | null;
};

/** A member's strikes and any suspension in force. Administrators only; never shown to the member. */
export async function getUserModeration(userId: string): Promise<UserModeration | null> {
  const { data, error } = await createAdminClient().rpc("admin_user_moderation", { p_user_id: userId });
  if (error) {
    console.error("User moderation lookup failed:", error.message);
    return null;
  }
  return data as UserModeration;
}


// --- AI triage -------------------------------------------------------------------------

export const AI_SUGGESTION_LABELS: Record<AiSuggestion, string> = {
  DISMISS: "Dismiss",
  WARN: "Warn the user",
  DEACTIVATE: "Deactivate the listing",
  NEEDS_HUMAN: "Needs a person",
};

export const AI_SIGNAL_LABELS: Record<string, string> = {
  threat: "Threat",
  harassment: "Harassment",
  off_platform_payment: "Asks to pay off the platform",
  scam: "Scam pattern",
  spam: "Spam",
  misleading_listing: "Misleading listing",
};

/** What the model made of one report: advice, never a decision, unless it dismissed it (see decision_by). */
export type ReportAssessment = {
  status: "PROCESSING" | "DONE" | "FAILED";
  suggestion: AiSuggestion | null;
  severity: number | null;
  confidence: number | null;
  signals: Record<string, boolean>;
  /** 1-based positions of the conversation's messages the model relied on. */
  cited_messages: number[];
  reasoning: string | null;
  failure_reason: string | null;
  model: string | null;
  prompt_version: string | null;
  completed_at: string | null;
};

/** Null before one exists. Administrators only. */
export async function getReportAssessment(reportId: string): Promise<ReportAssessment | null> {
  const { data, error } = await createAdminClient().rpc("admin_report_ai_assessment", { p_report_id: reportId });
  if (error) {
    console.error("Report assessment lookup failed:", error.message);
    return null;
  }
  return data as ReportAssessment | null;
}

/** One row of how often the model and the administrators agree. */
export type AiAgreementRow = {
  suggestion: AiSuggestion;
  decision: ReportDecisionKind;
  decided_by: "ADMIN" | "AI";
  reports: number;
  confident_reports: number;
};

/** What to read before turning auto-dismissal on. */
export async function getAiAgreement(): Promise<AiAgreementRow[]> {
  const { data, error } = await createAdminClient().rpc("admin_report_ai_agreement", {});
  if (error) {
    console.error("AI agreement lookup failed:", error.message);
    return [];
  }
  return (data ?? []) as AiAgreementRow[];
}
