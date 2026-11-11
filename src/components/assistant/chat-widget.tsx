"use client";

import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { MessageCircle, RotateCcw, Send, ThumbsDown, ThumbsUp, X } from "lucide-react";
import {
  CLIENT_TIMEOUT_MS,
  FEEDBACK_REASONS,
  MAX_FEEDBACK_NOTE_CHARS,
  MAX_MESSAGE_CHARS,
  applyEvent,
  feedbackBody,
  finishInterrupted,
  historyFor,
  loadState,
  newState,
  parseEvents,
  saveState,
  unavailable,
  type ChatCard,
  type ChatMessage,
  type ChatState,
  type FeedbackReason,
} from "@/lib/chat-assistant";
import { formatMoney } from "@/lib/format";
import { gearPath } from "@/lib/gear";
import { helpPath } from "@/lib/help";
import { CATEGORY_LABELS, type ListingCategory } from "@/lib/listings";
import { createClient } from "@/lib/supabase/client";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");

const SUGGESTIONS = [
  "I'm going camping next weekend, what do I need?",
  "What happens if I return late?",
  "How is my deposit protected?",
];

/** The member's token if signed in. The assistant works signed out too; this only counts toward their own rate limit. */
async function authHeader(): Promise<Record<string, string>> {
  try {
    const { data } = await createClient().auth.getSession();
    return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
  } catch {
    return {};
  }
}

function CardPrice({ card }: { card: ChatCard }) {
  if (card.price_per_day_cents !== null) return <>{formatMoney(card.price_per_day_cents)}/day</>;
  if (card.price_per_week_cents !== null) return <>{formatMoney(card.price_per_week_cents)}/week</>;
  return null;
}

function ListingCards({ cards }: { cards: ChatCard[] }) {
  return (
    <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="Matching listings">
      {cards.map((card) => (
        <li key={card.id} className="w-36 shrink-0">
          <Link href={gearPath(card)} className="block overflow-hidden rounded-xl border border-line bg-white transition-colors hover:border-ink-soft">
            <div className="relative aspect-[4/3] bg-surface-muted">
              {card.photo_url && <Image src={card.photo_url} alt="" fill sizes="144px" className="object-cover" />}
            </div>
            <div className="p-2">
              <p className="line-clamp-2 text-xs font-medium text-ink">{card.name}</p>
              <p className="mt-0.5 text-[11px] text-ink-soft">{CATEGORY_LABELS[card.category as ListingCategory] ?? card.category}</p>
              <p className="mt-1 text-xs font-semibold text-ink">
                <CardPrice card={card} />
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** S6-08 Scenario 1: after a thumbs down, pick a reason and optionally add a short note. */
function WhyNotHelpful({ onSend }: { onSend: (reason: FeedbackReason, note: string) => Promise<boolean> }) {
  const [reason, setReason] = useState<FeedbackReason | null>(null);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "failed">("idle");
  const noteId = useId();

  async function send() {
    if (!reason) return;
    setStatus("sending");
    setStatus((await onSend(reason, note)) ? "idle" : "failed");
  }

  return (
    <div className="space-y-2 rounded-xl border border-line p-2.5">
      <p className="text-xs text-ink-soft">What was wrong with this answer?</p>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Reason">
        {FEEDBACK_REASONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={reason === option.value}
            onClick={() => setReason(option.value)}
            className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
              reason === option.value ? "border-ink bg-ink text-white" : "border-line text-ink hover:bg-surface-muted"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {reason && (
        <>
          <label className="sr-only" htmlFor={noteId}>
            Add a note (optional)
          </label>
          <textarea
            id={noteId}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={MAX_FEEDBACK_NOTE_CHARS}
            rows={2}
            placeholder="Add a short note (optional)"
            className="w-full resize-none rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-soft focus:border-ink-soft focus:outline-none"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-ink-soft" aria-live="polite">
              {status === "failed" ? "That didn't send. Try again?" : `${note.length}/${MAX_FEEDBACK_NOTE_CHARS}`}
            </span>
            <button
              type="button"
              onClick={() => void send()}
              disabled={status === "sending"}
              className="rounded-full bg-ink px-3 py-1 text-xs font-medium text-white hover:bg-ink/90 disabled:opacity-60"
            >
              {status === "sending" ? "Sending…" : "Send feedback"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Reply({
  message,
  onRate,
  onExplain,
}: {
  message: ChatMessage;
  onRate: (message: ChatMessage, rating: 1 | -1) => void;
  onExplain: (message: ChatMessage, reason: FeedbackReason, note: string) => Promise<boolean>;
}) {
  const muted = message.kind === "unavailable";
  return (
    <div className="space-y-2">
      {(message.text || message.pending) && (
        <div className={`whitespace-pre-line rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm ${muted ? "bg-warning-soft text-ink" : "bg-surface-muted text-ink"}`}>
          {message.text}
          {message.pending && <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-ink-soft align-middle" aria-hidden />}
        </div>
      )}
      {/* Under the answer, which refers to "the listings below". */}
      {message.cards && message.cards.length > 0 && <ListingCards cards={message.cards} />}
      {message.browse && !message.pending && (
        <Link href={message.browse.href as Route} className="inline-block text-xs font-medium text-accent hover:underline">
          {message.browse.label}
        </Link>
      )}
      {message.sources && message.sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
          <span>From Help:</span>
          {message.sources.map((source) => (
            <Link key={source.slug} href={source.href as Route} className="rounded-full border border-line px-2 py-0.5 text-ink hover:border-ink-soft">
              {source.title}
            </Link>
          ))}
        </div>
      )}
      {message.actions && message.actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {message.actions.map((action) => (
            <Link key={action.href} href={action.href as Route} className="rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-ink hover:bg-surface-muted">
              {action.label}
            </Link>
          ))}
        </div>
      )}
      {message.turnId && !message.pending && message.kind !== "unavailable" && (
        <div className="flex items-center gap-1 text-ink-soft">
          <span className="sr-only">Was this helpful?</span>
          {([1, -1] as const).map((rating) => {
            const Icon = rating === 1 ? ThumbsUp : ThumbsDown;
            const selected = message.rating === rating;
            return (
              <button
                key={rating}
                type="button"
                onClick={() => onRate(message, rating)}
                aria-pressed={selected}
                aria-label={rating === 1 ? "Helpful" : "Not helpful"}
                className={`rounded-full p-1.5 transition-colors hover:bg-surface-muted ${selected ? "text-ink" : ""}`}
              >
                <Icon size={14} fill={selected ? "currentColor" : "none"} />
              </button>
            );
          })}
        </div>
      )}
      {message.turnId && message.rating === -1 && !message.feedbackReason && (
        <WhyNotHelpful onSend={(reason, note) => onExplain(message, reason, note)} />
      )}
      {message.rating === -1 && message.feedbackReason && (
        <p className="text-xs text-ink-soft">Thanks, that helps us improve the assistant.</p>
      )}
    </div>
  );
}

/**
 * S5-06: the assistant on every page (mounted in the root layout). Answers
 * stream in as they are written; the conversation is kept for the tab.
 */
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ChatState | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (state) saveState(window.sessionStorage, state);
  }, [state]);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [state, open]);
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);
  useEffect(() => () => abortRef.current?.abort(), []);

  // Read on opening rather than on render: sessionStorage does not exist on the server.
  function openPanel() {
    setState((current) => current ?? loadState(window.sessionStorage));
    setOpen(true);
  }

  const close = useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus();
  }, []);

  const updateReply = useCallback((id: string, change: (message: ChatMessage) => ChatMessage) => {
    setState((current) => current && { ...current, messages: current.messages.map((message) => (message.id === id ? change(message) : message)) });
  }, []);

  async function send(text: string) {
    const question = text.trim().slice(0, MAX_MESSAGE_CHARS);
    if (!question || !state || sending) return;
    const replyId = crypto.randomUUID();
    const history = historyFor(state.messages);
    setState({
      ...state,
      messages: [...state.messages, { id: crypto.randomUUID(), role: "user", text: question }, { id: replyId, role: "assistant", text: "", pending: true }],
    });
    setDraft("");
    setSending(true);

    const controller = new AbortController();
    abortRef.current = controller;
    const timer = window.setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    try {
      const response = await fetch(`${API_URL}/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ session_id: state.sessionId, message: question, history }),
        signal: controller.signal,
      });
      if (response.status === 429) {
        const detail = ((await response.json().catch(() => ({}))) as { detail?: string }).detail;
        updateReply(replyId, (message) => ({ ...message, kind: "declined", text: detail ?? "You're sending messages quickly. Please wait a moment.", pending: false }));
        return;
      }
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const parsed = parseEvents(buffer + decoder.decode(value, { stream: true }));
        buffer = parsed.rest;
        if (parsed.events.length) updateReply(replyId, (message) => parsed.events.reduce(applyEvent, message));
      }
      updateReply(replyId, (message) => (message.pending ? finishInterrupted(message) : message));
    } catch {
      updateReply(replyId, (message) => (message.pending ? (message.text.trim() ? finishInterrupted(message) : unavailable(message)) : message));
    } finally {
      window.clearTimeout(timer);
      abortRef.current = null;
      setSending(false);
    }
  }

  async function postFeedback(turnId: string, body: ReturnType<typeof feedbackBody>) {
    const response = await fetch(`${API_URL}/assistant/turns/${turnId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  }

  async function rate(message: ChatMessage, rating: 1 | -1) {
    if (!state || !message.turnId) return;
    const { rating: previous, feedbackReason: previousReason } = message;
    // A thumbs up clears the reason on the server too; a repeated thumbs down keeps it.
    updateReply(message.id, (current) => ({ ...current, rating, feedbackReason: rating === 1 ? undefined : current.feedbackReason }));
    try {
      await postFeedback(message.turnId, feedbackBody(state.sessionId, rating));
    } catch {
      updateReply(message.id, (current) => ({ ...current, rating: previous, feedbackReason: previousReason }));
    }
  }

  /** S6-08 Scenario 1: why the thumbs down. True once stored. */
  async function explain(message: ChatMessage, reason: FeedbackReason, note: string): Promise<boolean> {
    if (!state || !message.turnId) return false;
    try {
      await postFeedback(message.turnId, feedbackBody(state.sessionId, -1, reason, note));
      updateReply(message.id, (current) => ({ ...current, rating: -1, feedbackReason: reason }));
      return true;
    } catch {
      return false;
    }
  }

  function submit(event: { preventDefault(): void }) {
    event.preventDefault();
    void send(draft);
  }

  function startOver() {
    abortRef.current?.abort();
    setState(newState());
    inputRef.current?.focus();
  }

  return (
    <>
      {!open && (
        <button
          ref={launcherRef}
          type="button"
          onClick={openPanel}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 print:hidden rounded-full bg-ink px-4 py-3 text-sm font-medium text-white shadow-card-hover transition-colors hover:bg-ink/90"
          aria-haspopup="dialog"
        >
          <MessageCircle size={18} />
          <span className="hidden sm:inline">Ask HobbyRentals</span>
          <span className="sr-only sm:hidden">Open the assistant</span>
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="HobbyRentals assistant"
          onKeyDown={(event) => event.key === "Escape" && close()}
          className="fixed inset-0 z-40 flex flex-col bg-white print:hidden sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(640px,calc(100vh-2.5rem))] sm:w-[380px] sm:rounded-2xl sm:border sm:border-line sm:shadow-card-hover"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-ink">HobbyRentals assistant</p>
              <p className="text-xs text-ink-soft">Gear ideas and how renting works</p>
            </div>
            <div className="flex items-center gap-1">
              {state && state.messages.length > 0 && (
                <button type="button" onClick={startOver} className="rounded-full p-2 text-ink-soft hover:bg-surface-muted hover:text-ink" aria-label="Start a new chat">
                  <RotateCcw size={16} />
                </button>
              )}
              <button type="button" onClick={close} className="rounded-full p-2 text-ink-soft hover:bg-surface-muted hover:text-ink" aria-label="Close the assistant">
                <X size={18} />
              </button>
            </div>
          </div>

          <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite" aria-busy={sending}>
            {state && state.messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-ink-soft">
                  Ask what to rent for a trip or hobby, or how fees, deposits, late returns and cancellations work.
                </p>
                <div className="flex flex-col items-start gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void send(suggestion)}
                      className="rounded-full border border-line px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-muted"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {state?.messages.map((message) =>
              message.role === "user" ? (
                <div key={message.id} className="flex justify-end">
                  <p className="max-w-[85%] whitespace-pre-line rounded-2xl rounded-tr-sm bg-ink px-3.5 py-2.5 text-sm text-white">{message.text}</p>
                </div>
              ) : (
                <Reply key={message.id} message={message} onRate={rate} onExplain={explain} />
              ),
            )}
          </div>

          <form onSubmit={submit} className="flex items-end gap-2 border-t border-line p-3">
            <label htmlFor="chat-assistant-input" className="sr-only">
              Your question
            </label>
            <textarea
              id="chat-assistant-input"
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) submit(event);
              }}
              maxLength={MAX_MESSAGE_CHARS}
              rows={1}
              placeholder="Ask a question"
              className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-ink-soft"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="flex size-10 items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </form>
          <p className="px-3 pb-2 text-[11px] text-ink-soft">
            Answers come from our{" "}
            <Link href={helpPath()} className="underline">
              Help centre
            </Link>{" "}
            and current listings. Rate an answer to help us improve.
          </p>
        </div>
      )}
    </>
  );
}
