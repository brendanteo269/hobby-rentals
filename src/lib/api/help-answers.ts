import "server-only";

import { cache } from "react";
import { apiBaseUrl } from "@/lib/env";

/**
 * S6-08: an answer HobbyRentals staff wrote after the chat assistant got a
 * question wrong. The assistant cites it like a help section, linking here.
 */
export type HelpAnswer = {
  short_id: string;
  title: string;
  question: string;
  answer: string;
  related: { slug: string; title: string; href: string }[];
  updated_at: string;
};

const SHORT_ID = /^[0-9a-f]{8}$/;

/**
 * null when there is no such answer, or it was withdrawn. Public, so it skips
 * backendRequest (which sends anyone signed out to the login screen). Cached
 * for five minutes: an edit or a withdrawal shows within that.
 */
export const getHelpAnswer = cache(async (id: string): Promise<HelpAnswer | null> => {
  if (!SHORT_ID.test(id)) return null;
  const res = await fetch(`${apiBaseUrl()}/assistant/answers/${id}`, { next: { revalidate: 300 } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Help answer request failed (${res.status})`);
  return (await res.json()) as HelpAnswer;
});
