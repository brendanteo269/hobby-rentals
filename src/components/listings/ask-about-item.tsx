"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState, type FormEvent } from "react";
import { MessageCircleQuestion, Sparkles } from "lucide-react";
import { Button, FormError } from "@/components/ui";
import { MessageWarningModal } from "@/components/messages/message-warning-modal";
import { askOwner, askQuestion } from "@/app/listings/[id]/question-actions";
import type { NeedsConfirmation } from "@/lib/conversations";
import { MAX_QUESTION_CHARS, sourceList, type InstantAnswer } from "@/lib/listing-questions";

/**
 * S5-07: a renter asks about the item and gets an answer at once, from the
 * listing's description, specifications, condition history, reviews and the
 * owner's earlier answers - or "not sure", with a button that sends the
 * question to the owner as a message (S2-16), after the S4-15 checks.
 */
export function AskAboutItem({ listingId }: { listingId: string }) {
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState("");
  const [answer, setAnswer] = useState<InstantAnswer | null>(null);
  const [error, setError] = useState<string>();
  const [asking, setAsking] = useState(false);
  const [sending, setSending] = useState(false);
  const [held, setHeld] = useState<NeedsConfirmation | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function ask(event: FormEvent) {
    event.preventDefault();
    const text = question.trim();
    if (!text || asking) return;
    setAsking(true);
    setError(undefined);
    setSentTo(null);
    const result = await askQuestion(listingId, text);
    setAsking(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setAsked(text);
    setAnswer(result.answer);
  }

  async function sendToOwner(confirmationId?: string) {
    setSending(true);
    setError(undefined);
    const result = await askOwner(listingId, asked, confirmationId);
    setSending(false);
    if ("error" in result) {
      setHeld(null);
      setError(result.error);
      return;
    }
    if ("confirmation" in result) {
      setHeld(result.confirmation);
      return;
    }
    setHeld(null);
    setSentTo(result.forwarded.conversation_id);
  }

  return (
    <section className="mt-6 border-t border-line pt-6" aria-labelledby="ask-about-item-title">
      <h2 id="ask-about-item-title" className="heading text-lg">
        Ask about this item
      </h2>
      <p className="body-copy mt-1">Get an answer now from the listing, its condition history and reviews.</p>

      <form onSubmit={ask} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="ask-about-item" className="sr-only">
          Your question
        </label>
        <input
          id="ask-about-item"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={MAX_QUESTION_CHARS}
          placeholder="e.g. Is this waterproof?"
          className="min-h-10 flex-1 rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-ink-soft"
        />
        <Button type="submit" variant="solid" disabled={asking || !question.trim()} className="px-4 py-2">
          {asking ? "Checking the listing…" : "Ask"}
        </Button>
      </form>
      <FormError message={error} />

      {answer && (
        <div className="mt-4 rounded-2xl bg-surface-muted p-4 text-sm" aria-live="polite">
          <p className="text-xs text-ink-soft">You asked: {asked}</p>
          <p className="mt-2 flex gap-2 text-ink">
            {answer.kind === "answer" && <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />}
            <span>{answer.text}</span>
          </p>
          {answer.sources.length > 0 && (
            <p className="mt-2 text-xs text-ink-soft">Answered from: {sourceList(answer.sources)}</p>
          )}

          {sentTo ? (
            <p className="mt-3 text-sm text-ink">
              Sent to the owner. Their reply will be in{" "}
              <Link href={`/messages/${sentTo}` as Route} className="font-medium underline underline-offset-2">
                Messages
              </Link>
              .
            </p>
          ) : (
            answer.can_ask_owner && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button type="button" variant={answer.kind === "answer" ? "outline" : "accent"} onClick={() => void sendToOwner()} disabled={sending} className="px-4 py-2 text-xs">
                  <MessageCircleQuestion className="mr-1.5 size-4" aria-hidden="true" />
                  {sending ? "Sending…" : "Ask the owner"}
                </Button>
                {answer.kind === "answer" && <span className="text-xs text-ink-soft">Need more detail? The owner can answer directly.</span>}
              </div>
            )
          )}
        </div>
      )}

      {held && (
        <MessageWarningModal warnings={held.warnings} isSending={sending} onEdit={() => setHeld(null)} onSend={() => void sendToOwner(held.confirmation_id)} />
      )}
    </section>
  );
}
