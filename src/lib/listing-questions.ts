/**
 * S5-07: "Ask about this item" - what the API answers, and what an owner sees
 * of the questions renters sent them. Safe for client components.
 */

export type AnswerSource = { id: string; label: string };

export type InstantAnswer = {
  kind: "answer" | "not_sure" | "declined" | "unavailable";
  text: string;
  /** Which of the listing's sources the answer came from (Scenario 1). */
  sources: AnswerSource[];
  /** Whether to offer "Ask the owner": never for a declined question, nor on your own listing. */
  can_ask_owner: boolean;
};

export type ForwardedQuestion = { question_id: string; conversation_id: string };

/** A published question and answer; renters are never named. */
export type PublicQuestion = { question: string; answer: string; published_at: string };

export type OwnerQuestion = {
  id: string;
  question: string;
  topic: string | null;
  answer: string | null;
  answered_at: string | null;
  show_on_listing: boolean;
  published_at: string | null;
  conversation_id: string | null;
  created_at: string;
};

/** Scenario 4: a detail renters keep asking about. */
export type RepeatedTopic = { topic: string; count: number };

export type OwnerQuestions = { questions: OwnerQuestion[]; repeated_topics: RepeatedTopic[] };

export const MAX_QUESTION_CHARS = 500;

/** "Description and Reviews", "Description, Specifications and Reviews". */
export function sourceList(sources: AnswerSource[]): string {
  const labels = sources.map((source) => source.label);
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
}
