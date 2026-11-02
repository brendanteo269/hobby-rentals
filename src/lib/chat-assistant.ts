/**
 * S5-06: the chat assistant widget's state, and how it reads the API's
 * streamed reply. Safe for client components; kept apart from the widget so
 * it can be tested without a browser.
 *
 * The API (POST /assistant/chat) answers as Server-Sent Events: `listings`,
 * `token`, `sources`, `fallback` or `unavailable`, then `done` with the
 * stored turn's id, which a thumbs up or down is sent against.
 *
 * The conversation lives in sessionStorage, so it survives moving between
 * pages and reloading, and is gone when the tab closes (Scenario 1).
 */

export const STORAGE_KEY = "hr-chat-assistant";
/** The API gives up at 20 s; this allows for the network on top. */
export const CLIENT_TIMEOUT_MS = 22_000;
export const MAX_MESSAGE_CHARS = 500;
/** How many earlier messages go with each question, as the API keeps no conversation of its own. */
export const HISTORY_MESSAGES = 6;

export type ChatLink = { label: string; href: string };

export type ChatCard = {
  id: string;
  short_id: string;
  name: string;
  category: string;
  price_per_day_cents: number | null;
  price_per_week_cents: number | null;
  photo_url: string | null;
};

export type ChatSource = { slug: string; title: string; href: string };

export type ReplyKind = "answer" | "not_sure" | "declined" | "greeting" | "unavailable";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  kind?: ReplyKind;
  cards?: ChatCard[];
  /** Shown when a gear question found no listings. */
  browse?: ChatLink;
  sources?: ChatSource[];
  actions?: ChatLink[];
  turnId?: string | null;
  rating?: 1 | -1;
  /** Still streaming. */
  pending?: boolean;
};

export type ChatState = { sessionId: string; messages: ChatMessage[] };

export type ChatEvent = { event: string; data: Record<string, unknown> };

export const UNAVAILABLE_TEXT = "The assistant is unavailable right now.";
export const UNAVAILABLE_LINKS: ChatLink[] = [
  { label: "Browse listings", href: "/browse" },
  { label: "Help centre", href: "/help" },
];

export function newState(): ChatState {
  return { sessionId: crypto.randomUUID(), messages: [] };
}

export function loadState(storage: Pick<Storage, "getItem"> | undefined): ChatState {
  try {
    const saved = storage?.getItem(STORAGE_KEY);
    const parsed = saved ? (JSON.parse(saved) as ChatState) : null;
    if (parsed && typeof parsed.sessionId === "string" && Array.isArray(parsed.messages)) {
      // A reply cut off by a reload will never finish; show it as it stood.
      return { ...parsed, messages: parsed.messages.map((message) => (message.pending ? finishInterrupted(message) : message)) };
    }
  } catch {
    // Unreadable storage starts a fresh conversation rather than breaking the widget.
  }
  return newState();
}

export function saveState(storage: Pick<Storage, "setItem"> | undefined, state: ChatState): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: the conversation still works, it just won't survive a reload.
  }
}

/** Complete events in `buffer`, and the incomplete rest to keep for the next chunk. */
export function parseEvents(buffer: string): { events: ChatEvent[]; rest: string } {
  const blocks = buffer.replace(/\r\n/g, "\n").split("\n\n");
  const rest = blocks.pop() ?? "";
  const events: ChatEvent[] = [];
  for (const block of blocks) {
    let event = "message";
    const data: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
    }
    if (!data.length) continue;
    try {
      events.push({ event, data: JSON.parse(data.join("\n")) });
    } catch {
      // A malformed event is skipped; the rest of the reply still shows.
    }
  }
  return { events, rest };
}

/** The assistant's message with one more event applied. */
export function applyEvent(message: ChatMessage, { event, data }: ChatEvent): ChatMessage {
  switch (event) {
    case "token":
      return { ...message, kind: "answer", text: message.text + String(data.text ?? "") };
    case "listings": {
      const cards = (data.cards as ChatCard[]) ?? [];
      return { ...message, cards, browse: cards.length ? undefined : (data.browse as ChatLink) };
    }
    case "sources":
      return { ...message, sources: (data.items as ChatSource[]) ?? [] };
    case "fallback":
      return { ...message, kind: data.kind as ReplyKind, text: String(data.text ?? ""), actions: (data.actions as ChatLink[]) ?? [] };
    case "unavailable":
      return unavailable(message);
    case "done":
      return { ...message, pending: false, turnId: (data.turn_id as string | null) ?? null };
    default:
      return message;
  }
}

/** The client's own "unavailable", for a network failure or no reply in time (Scenario 7). */
export function unavailable(message: ChatMessage): ChatMessage {
  // `browse` goes too: the links below already offer browsing, and two would show.
  return { ...message, kind: "unavailable", text: UNAVAILABLE_TEXT, actions: UNAVAILABLE_LINKS, cards: undefined, browse: undefined, sources: undefined, pending: false };
}

/** A reply that stopped part-way: what arrived stays, or it becomes "unavailable" if nothing did. */
export function finishInterrupted(message: ChatMessage): ChatMessage {
  if (!message.text.trim() || message.kind === undefined) return unavailable(message);
  return { ...message, pending: false };
}

/** The earlier conversation sent with a question: finished messages with text, most recent last. */
export function historyFor(messages: ChatMessage[]): { role: "user" | "assistant"; content: string }[] {
  return messages
    .filter((message) => !message.pending && message.text.trim() && message.kind !== "unavailable")
    .slice(-HISTORY_MESSAGES)
    .map((message) => ({ role: message.role, content: message.text }));
}
