import { createAdminClient } from "@/lib/supabase/admin";
import type { StatusTone } from "@/lib/users";

/**
 * S3-23: reports on listings (S3-21) and users (S3-22), their priority and case
 * age, strikes and the AI's assessments. Each kind is reviewed and decided where
 * its subject is (a listing on its listing page, a user on their user page), and
 * the queue of what is waiting sits at the top of that list. Priority and case
 * age are worked out in the database (admin_moderation_queue), not stored, so
 * they never go stale.
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
  /** The enforcement in force, if any: a ban has no end. */
  suspension: {
    id: string;
    kind: "SUSPENSION" | "BAN";
    source: "STRIKES" | "ADMIN";
    report_id: string | null;
    reason: string;
    starts_at: string;
    ends_at: string | null;
  } | null;
};

/** One entry in a member's suspend/ban history (S3-24): what was done, by what route and for how long. */
export type Enforcement = {
  id: string;
  kind: "SUSPENSION" | "BAN";
  /** STRIKES: the strike limit was reached. ADMIN: an administrator did it. */
  source: "STRIKES" | "ADMIN";
  reason: string;
  report_id: string | null;
  starts_at: string;
  /** Null for a ban. */
  ends_at: string | null;
  actor_label: string | null;
  /** Set when an administrator lifted a suspension early; a ban can never be lifted. */
  lifted_at: string | null;
  lifted_reason: string | null;
  lifted_by_label: string | null;
  /** In force now: not over, and not lifted. */
  active: boolean;
};

/** A member's suspend/ban history, newest first. Administrators only; never shown to the member. */
export async function getUserSuspendBanHistory(userId: string): Promise<Enforcement[]> {
  const { data, error } = await createAdminClient().rpc("admin_user_enforcements", { p_user_id: userId });
  if (error) {
    console.error("Enforcement history lookup failed:", error.message);
    return [];
  }
  return (data ?? []) as Enforcement[];
}

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
  /** How many times a worker has picked it up: none yet means it is still waiting for one. */
  attempts: number;
  /** How long it has been queued, by the database's clock. */
  queued_seconds: number;
  completed_at: string | null;
};

/** Mirrors report_triage_max_attempts, after which an assessment is given up on. */
export const ASSESSMENT_MAX_ATTEMPTS = 3;

/** How long an assessment may wait unclaimed before the page suggests the worker is not running. */
export const ASSESSMENT_STALLED_AFTER_SECONDS = 180;

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
