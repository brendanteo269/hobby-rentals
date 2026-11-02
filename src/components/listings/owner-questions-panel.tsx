"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { Badge, Button, FormError } from "@/components/ui";
import { MessageWarningModal } from "@/components/messages/message-warning-modal";
import { answerQuestion, changeQuestionVisibility } from "@/app/listings/[id]/question-actions";
import type { NeedsConfirmation } from "@/lib/conversations";
import { formatDateTime } from "@/lib/format";
import type { OwnerQuestion, OwnerQuestions } from "@/lib/listing-questions";

function QuestionCard({ listingId, initial }: { listingId: string; initial: OwnerQuestion }) {
  const [question, setQuestion] = useState(initial);
  const [draft, setDraft] = useState("");
  const [show, setShow] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [held, setHeld] = useState<NeedsConfirmation | null>(null);

  async function submit(confirmationId?: string) {
    if (!draft.trim()) return;
    setBusy(true);
    setError(undefined);
    const result = await answerQuestion(listingId, question.id, draft, show, confirmationId);
    setBusy(false);
    if ("error" in result) {
      setHeld(null);
      setError(result.error);
    } else if ("confirmation" in result) {
      setHeld(result.confirmation);
    } else {
      setHeld(null);
      setQuestion(result.question);
      setDraft("");
    }
  }

  async function toggle(showOnListing: boolean) {
    setBusy(true);
    setError(undefined);
    const result = await changeQuestionVisibility(listingId, question.id, showOnListing);
    setBusy(false);
    if ("error" in result) setError(result.error);
    else setQuestion(result.question);
  }

  return (
    <li className="py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-medium text-ink">{question.question}</p>
        <div className="flex items-center gap-2">
          {question.topic && <Badge variant="neutral">{question.topic}</Badge>}
          {question.show_on_listing && <Badge variant="dark">On listing</Badge>}
        </div>
      </div>
      <p className="mt-1 text-xs text-ink-soft">
        Asked {formatDateTime(question.created_at)}
        {question.conversation_id && (
          <>
            {" · "}
            <Link href={`/messages/${question.conversation_id}` as Route} className="underline underline-offset-2 hover:text-ink">
              Open the conversation
            </Link>
          </>
        )}
      </p>

      {question.answer ? (
        <div className="mt-3 rounded-xl bg-surface-muted p-3 text-sm">
          <p className="text-ink">{question.answer}</p>
          <label className="mt-3 flex items-center gap-2 text-xs text-ink">
            <input type="checkbox" checked={question.show_on_listing} disabled={busy} onChange={(event) => void toggle(event.target.checked)} />
            Show on listing, without the renter&apos;s name
          </label>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <label htmlFor={`answer-${question.id}`} className="sr-only">
            Your answer
          </label>
          <textarea
            id={`answer-${question.id}`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Your answer goes to the renter in Messages"
            className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-ink-soft"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-ink">
              <input type="checkbox" checked={show} onChange={(event) => setShow(event.target.checked)} />
              Show on listing, without the renter&apos;s name
            </label>
            <Button type="button" variant="solid" disabled={busy || !draft.trim()} onClick={() => void submit()} className="px-4 py-2 text-xs">
              {busy ? "Sending…" : "Send answer"}
            </Button>
          </div>
        </div>
      )}
      <FormError message={error} />
      {held && <MessageWarningModal warnings={held.warnings} isSending={busy} onEdit={() => setHeld(null)} onSend={() => void submit(held.confirmation_id)} />}
    </li>
  );
}

/**
 * S5-07, for the owner: the questions renters sent from "Ask about this item".
 * Answering here sends the answer to the renter's conversation and, if ticked,
 * shows it on the listing, where the instant answers use it too (Scenario 3).
 * Details asked about again and again are flagged for the description
 * (Scenario 4). A reply written in Messages counts as the answer as well.
 */
export function OwnerQuestionsPanel({ listingId, data }: { listingId: string; data: OwnerQuestions }) {
  return (
    <section id="questions" className="mt-6 scroll-mt-24 border-t border-line pt-6">
      <h2 className="heading text-lg">Questions from renters</h2>
      <p className="body-copy mt-1">Questions the instant answers could not cover. Answers you show on the listing are used for later renters.</p>

      {data.repeated_topics.length > 0 && (
        <div className="mt-4 flex gap-3 rounded-xl border border-warning/40 bg-warning-soft p-4 text-sm">
          <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium text-ink">
              Renters keep asking about {data.repeated_topics.map((t) => `${t.topic} (${t.count} times)`).join(", ")}.
            </p>
            <p className="mt-1 text-ink">Add it to your description so they get an answer straight away.</p>
            <Link href={`/listings/${listingId}/edit` as Route} className="mt-2 inline-block font-medium underline underline-offset-2">
              Edit the description
            </Link>
          </div>
        </div>
      )}

      {data.questions.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">No questions yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {data.questions.map((question) => (
            <QuestionCard key={question.id} listingId={listingId} initial={question} />
          ))}
        </ul>
      )}
    </section>
  );
}
