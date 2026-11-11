"use client";

import { useActionState, useId } from "react";
import { Button, FormMessage, Input, RequiredMark, Textarea } from "./ui";
import { useToast } from "./toast";
import { saveCorrection, type FormState } from "@/app/assistant/actions";
import { MAX_CORRECTION_CHARS } from "@/lib/assistant";

/**
 * S6-08 Scenario 2: the admin writes the answer the assistant should have
 * given. It is saved as an approved answer for questions like this one: the
 * assistant draws on it and cites it from then on.
 */
export function AssistantCorrectionForm({
  turnId,
  question,
  slugs = [],
}: {
  turnId: string;
  question: string;
  slugs?: string[];
}) {
  const { show } = useToast();
  // The toast is raised here rather than from an effect: a saved correction
  // re-renders the page without this form (the answer is now corrected), so
  // an effect on the result would never run.
  const [state, action, pending] = useActionState<FormState, FormData>(async (previous, form) => {
    const result = await saveCorrection(previous, form);
    if (result?.success) show(result.success, "success");
    return result;
  }, undefined);
  const id = useId();

  if (state?.success) return <p className="text-xs text-ink-soft">Correction saved.</p>;

  return (
    <details className="group">
      <summary className="cursor-pointer text-sm font-medium underline underline-offset-4 hover:text-ink-soft">Write a correction</summary>
      <form action={action} className="mt-3 space-y-3 border-l-2 border-line pl-4">
        <input type="hidden" name="turn_id" value={turnId} />
        <div>
          <label htmlFor={`${id}-answer`} className="block text-xs font-medium">
            Corrected answer
            <RequiredMark />
          </label>
          <Textarea id={`${id}-answer`} name="answer" required rows={4} maxLength={MAX_CORRECTION_CHARS} className="mt-1.5" />
          <p className="mt-1 text-xs text-ink-soft">Members can read this on the web app, where the assistant cites it. Write it for them, with no member&apos;s details.</p>
        </div>
        <div>
          <label htmlFor={`${id}-question`} className="block text-xs font-medium">Question it answers</label>
          <Textarea id={`${id}-question`} name="question" rows={2} maxLength={500} defaultValue={question} className="mt-1.5" />
          <p className="mt-1 text-xs text-ink-soft">Reword it more generally to cover more ways of asking, or to take out anything personal.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-title`} className="block text-xs font-medium">Title (optional)</label>
            <Input id={`${id}-title`} name="title" maxLength={120} placeholder="The question, shortened" className="mt-1.5" />
          </div>
          <div>
            <label htmlFor={`${id}-slugs`} className="block text-xs font-medium">Help sections it relies on</label>
            <Input id={`${id}-slugs`} name="related_slugs" defaultValue={slugs.join(", ")} placeholder="cancellation-refunds, deposit-return" className="mt-1.5" />
          </div>
        </div>
        <FormMessage state={state?.error ? state : undefined} />
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save correction"}</Button>
      </form>
    </details>
  );
}
