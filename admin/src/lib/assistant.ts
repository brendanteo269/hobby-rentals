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
