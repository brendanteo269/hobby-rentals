import { describe, expect, it } from "vitest";
import {
  STORAGE_KEY,
  UNAVAILABLE_LINKS,
  applyEvent,
  finishInterrupted,
  historyFor,
  loadState,
  parseEvents,
  saveState,
  type ChatEvent,
  type ChatMessage,
} from "@/lib/chat-assistant";

const pending: ChatMessage = { id: "r1", role: "assistant", text: "", pending: true };
const card = { id: "a", short_id: "aaaaaaaa", name: "Tent", category: "CAMPING_OUTDOOR", price_per_day_cents: 1500, price_per_week_cents: null, photo_url: null };

function memoryStorage() {
  const items = new Map<string, string>();
  return { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => void items.set(key, value) };
}

describe("parseEvents", () => {
  it("reads complete events and keeps the incomplete rest", () => {
    const { events, rest } = parseEvents('event: token\ndata: {"text": "Hi"}\n\nevent: done\ndata: {"turn');
    expect(events).toEqual([{ event: "token", data: { text: "Hi" } }]);
    expect(rest).toBe('event: done\ndata: {"turn');
  });

  it("joins an event split across network chunks", () => {
    const first = parseEvents('event: token\ndata: {"te');
    const second = parseEvents(first.rest + 'xt": "lo"}\n\n');
    expect(first.events).toEqual([]);
    expect(second.events).toEqual([{ event: "token", data: { text: "lo" } }]);
  });

  it("skips a malformed event", () => {
    expect(parseEvents("event: token\ndata: {nope\n\n").events).toEqual([]);
  });
});

describe("applyEvent", () => {
  const apply = (events: ChatEvent[]) => events.reduce(applyEvent, pending);

  it("builds a streamed answer with its cards, sources and turn", () => {
    const message = apply([
      { event: "listings", data: { cards: [card], browse: { label: "Browse listings", href: "/browse" } } },
      { event: "token", data: { text: "Bring a tent. " } },
      { event: "token", data: { text: "See the listings below." } },
      { event: "sources", data: { items: [{ slug: "deposit-hold", title: "How the deposit is held", href: "/help#deposit-hold" }] } },
      { event: "done", data: { turn_id: "t1" } },
    ]);
    expect(message).toMatchObject({ kind: "answer", text: "Bring a tent. See the listings below.", cards: [card], pending: false, turnId: "t1" });
    expect(message.browse).toBeUndefined();
    expect(message.sources?.[0].href).toBe("/help#deposit-hold");
  });

  it("offers browsing when a gear question found no listings", () => {
    const message = apply([{ event: "listings", data: { cards: [], browse: { label: "Browse listings", href: "/browse" } } }]);
    expect(message.browse).toEqual({ label: "Browse listings", href: "/browse" });
  });

  it("shows a fixed reply with its actions", () => {
    const message = apply([
      { event: "fallback", data: { kind: "not_sure", text: "I'm not sure.", actions: [{ label: "Contact support", href: "/help#contact-support" }] } },
      { event: "done", data: { turn_id: "t2" } },
    ]);
    expect(message).toMatchObject({ kind: "not_sure", text: "I'm not sure.", turnId: "t2" });
    expect(message.actions?.[0].label).toBe("Contact support");
  });

  it("shows unavailable with links to browse and help (Scenario 7)", () => {
    const message = apply([{ event: "unavailable", data: {} }, { event: "done", data: { turn_id: null } }]);
    expect(message).toMatchObject({ kind: "unavailable", text: "The assistant is unavailable right now.", actions: UNAVAILABLE_LINKS, turnId: null });
  });
});

describe("finishInterrupted", () => {
  it("keeps what arrived of a cut-off answer", () => {
    expect(finishInterrupted({ ...pending, kind: "answer", text: "Bring a tent." })).toMatchObject({ text: "Bring a tent.", pending: false });
  });

  it("becomes unavailable when nothing arrived", () => {
    expect(finishInterrupted(pending).kind).toBe("unavailable");
  });
});

describe("historyFor", () => {
  it("sends the last finished messages, without unavailable replies", () => {
    const messages: ChatMessage[] = [
      ...Array.from({ length: 8 }, (_, i): ChatMessage => ({ id: `m${i}`, role: i % 2 ? "assistant" : "user", text: `m${i}`, kind: i % 2 ? "answer" : undefined })),
      { id: "u", role: "assistant", text: "The assistant is unavailable right now.", kind: "unavailable" },
      { ...pending },
    ];
    expect(historyFor(messages).map((m) => m.content)).toEqual(["m2", "m3", "m4", "m5", "m6", "m7"]);
  });
});

describe("loadState and saveState", () => {
  it("keeps the conversation for the tab", () => {
    const storage = memoryStorage();
    saveState(storage, { sessionId: "s1", messages: [{ id: "m", role: "user", text: "hi" }] });
    expect(loadState(storage)).toEqual({ sessionId: "s1", messages: [{ id: "m", role: "user", text: "hi" }] });
  });

  it("finishes a reply that a reload cut off", () => {
    const storage = memoryStorage();
    saveState(storage, { sessionId: "s1", messages: [pending] });
    expect(loadState(storage).messages[0].kind).toBe("unavailable");
  });

  it("starts fresh when storage is missing or unreadable", () => {
    const storage = memoryStorage();
    storage.setItem(STORAGE_KEY, "{not json");
    expect(loadState(storage).messages).toEqual([]);
    expect(loadState(undefined).sessionId).toMatch(/^[0-9a-f-]{36}$/);
  });
});
