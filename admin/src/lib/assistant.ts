import { adminApiKey, apiUrl } from "@/lib/env";

/**
 * S5-06: the chat assistant's answers and the ratings visitors gave them, for
 * review. Visitors need not be signed in, so a turn names no member - only
 * whether the asker was signed in.
 */

export type AssistantOutcome = "ANSWERED" | "NOT_SURE" | "DECLINED" | "UNAVAILABLE";

export const OUTCOME_LABELS: Record<AssistantOutcome, string> = {
  ANSWERED: "Answered",
  NOT_SURE: "Not sure",
  DECLINED: "Declined",
  UNAVAILABLE: "Unavailable",
};

export const RATING_FILTERS = [
  { key: "", label: "All" },
  { key: "-1", label: "Thumbs down" },
  { key: "1", label: "Thumbs up" },
  { key: "0", label: "Unrated" },
] as const;

export type AssistantTurn = {
  id: string;
  question: string;
  answer: string;
  intent: string;
  outcome: AssistantOutcome;
  source_slugs: string[];
  listing_ids: string[];
  latency_ms: number | null;
  created_at: string;
  signed_in: boolean;
  rating: 1 | -1 | null;
  /** S6-08: why a thumbs down, if the visitor said. */
  reason: FeedbackReason | null;
  note: string | null;
  /** S6-08: the correction written from this answer. */
  correction_id: string | null;
  /** S6-08: the closest approved correction to this question, if close enough to be given to the assistant. */
  covered_by: string | null;
  covered_similarity: number | null;
};

export type FeedbackReason = "WRONG" | "NOT_HELPFUL" | "OUT_OF_DATE" | "NO_GEAR" | "OTHER";

export const REASON_LABELS: Record<FeedbackReason | "NONE", string> = {
  WRONG: "Wrong",
  NOT_HELPFUL: "Not helpful",
  OUT_OF_DATE: "Out of date",
  NO_GEAR: "Didn't find gear",
  OTHER: "Other",
  NONE: "No reason given",
};

export type AssistantSummary = {
  turns: number;
  answered: number;
  not_sure: number;
  declined: number;
  unavailable: number;
  thumbs_up: number;
  thumbs_down: number;
};

export const PAGE_SIZE = 25;

async function apiError(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null);
  return typeof body?.detail === "string" ? body.detail : `${fallback}: ${response.status}`;
}

export async function listAssistantTurns(filters: {
  rating: string;
  outcome: string;
  page: number;
}): Promise<{ items: AssistantTurn[]; total: number; error: string | null }> {
  const query = new URLSearchParams({ page: String(filters.page), page_size: String(PAGE_SIZE) });
  if (filters.rating) query.set("rating", filters.rating);
  if (filters.outcome) query.set("outcome", filters.outcome);
  const response = await fetch(`${apiUrl()}/admin/chat-assistant/turns?${query}`, {
    headers: { "X-Admin-Key": adminApiKey() },
    cache: "no-store",
  });
  if (!response.ok) return { items: [], total: 0, error: await apiError(response, "Could not load the assistant's answers") };
  const body = await response.json();
  return { items: body.items, total: body.total, error: null };
}

export async function getAssistantSummary(days: number): Promise<AssistantSummary | null> {
  const response = await fetch(`${apiUrl()}/admin/chat-assistant/summary?days=${days}`, {
    headers: { "X-Admin-Key": adminApiKey() },
    cache: "no-store",
  });
  return response.ok ? response.json() : null;
}

/** Re-reads the web app's help centre now, rather than at the next hourly sync. */
export async function resyncHelpContent(): Promise<{ chunks: number; embedded: number; removed: number } | { error: string }> {
  const response = await fetch(`${apiUrl()}/admin/chat-assistant/help/resync`, {
    method: "POST",
    headers: { "X-Admin-Key": adminApiKey() },
    cache: "no-store",
  });
  if (!response.ok) return { error: await apiError(response, "The help content could not be synced") };
  return response.json();
}


// --- S6-08: answers the assistant learns from ---------------------------------------------------

export type ApprovedAnswerKind = "CORRECTION" | "EXAMPLE";
export type ApprovedAnswerStatus = "APPROVED" | "RETIRED";

export type ApprovedAnswer = {
  id: string;
  short_id: string;
  kind: ApprovedAnswerKind;
  status: ApprovedAnswerStatus;
  question: string;
  answer: string;
  title: string;
  related_slugs: string[];
  source_turn_id: string | null;
  support: { members?: number; thumbs_up?: number; thumbs_down?: number; retired_because?: string } | null;
  needs_review: boolean;
  created_at: string;
  updated_at: string;
};

export const MAX_CORRECTION_CHARS = 1200;

const adminHeaders = () => ({ "X-Admin-Key": adminApiKey(), "Content-Type": "application/json" });

/** Slugs typed as "a, b c" into the list the API takes. */
export function parseSlugs(text: string): string[] {
  return [...new Set(text.split(/[\s,]+/).map((slug) => slug.trim().toLowerCase()).filter(Boolean))];
}

export async function createCorrection(
  turnId: string,
  body: { answer: string; title?: string; question?: string; related_slugs: string[] },
): Promise<{ answer: ApprovedAnswer } | { error: string }> {
  const response = await fetch(`${apiUrl()}/admin/chat-assistant/turns/${turnId}/correction`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = (await response.json().catch(() => null))?.detail;
    if (response.status === 409) return { error: "This answer already has a correction. Edit it under Approved answers." };
    if (response.status === 422 && Array.isArray(detail)) return { error: "Check the answer (up to 1,200 characters) and the help section slugs." };
    return { error: typeof detail === "string" ? detail : `Could not save the correction: ${response.status}` };
  }
  return { answer: await response.json() };
}

export async function listApprovedAnswers(filters: {
  kind: string;
  status: string;
  page: number;
}): Promise<{ items: ApprovedAnswer[]; total: number; error: string | null }> {
  const query = new URLSearchParams({ page: String(filters.page), page_size: String(PAGE_SIZE) });
  if (filters.kind) query.set("kind", filters.kind);
  if (filters.status) query.set("status", filters.status);
  const response = await fetch(`${apiUrl()}/admin/chat-assistant/answers?${query}`, { headers: adminHeaders(), cache: "no-store" });
  if (!response.ok) return { items: [], total: 0, error: await apiError(response, "Could not load the approved answers") };
  const body = await response.json();
  return { items: body.items, total: body.total, error: null };
}

export async function updateApprovedAnswer(
  id: string,
  changes: Partial<Pick<ApprovedAnswer, "answer" | "title" | "question" | "related_slugs" | "status">> & { reviewed?: boolean },
): Promise<{ answer: ApprovedAnswer } | { error: string }> {
  const response = await fetch(`${apiUrl()}/admin/chat-assistant/answers/${id}`, {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify(changes),
    cache: "no-store",
  });
  if (!response.ok) return { error: await apiError(response, "Could not save the answer") };
  return { answer: await response.json() };
}

export async function promoteGoodAnswers(): Promise<{ promoted: number; updated: number; retired: number } | { error: string }> {
  const response = await fetch(`${apiUrl()}/admin/chat-assistant/answers/promote`, { method: "POST", headers: adminHeaders(), cache: "no-store" });
  if (!response.ok) return { error: await apiError(response, "Could not check for good answers") };
  return response.json();
}

export type FeedbackReport = {
  top_down_topics: { topic: string; count: number; reasons: Partial<Record<FeedbackReason | "NONE", number>> }[];
  weekly: { week: string; up: number; down: number; up_rate: number | null }[];
  uncorrected: {
    question: string;
    count: number;
    latest_turn_id: string;
    latest_at: string;
    reasons: Partial<Record<FeedbackReason | "NONE", number>>;
    notes: string[];
    other_questions: string[];
  }[];
  uncorrected_total: number;
  near_examples: { question: string; members: number }[];
  example_min_members: number;
};

export async function getFeedbackReport(weeks: number): Promise<FeedbackReport | { error: string }> {
  const response = await fetch(`${apiUrl()}/admin/chat-assistant/feedback-report?weeks=${weeks}`, { headers: adminHeaders(), cache: "no-store" });
  if (!response.ok) return { error: await apiError(response, "Could not load the feedback report") };
  return response.json();
}
