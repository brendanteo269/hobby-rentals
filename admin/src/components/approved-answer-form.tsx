"use client";

import { useActionState, useEffect, useId } from "react";
import { Button, FormMessage, Input, Textarea } from "./ui";
import { useToast } from "./toast";
import { changeApprovedAnswer, type FormState } from "@/app/assistant/actions";
import { MAX_CORRECTION_CHARS, type ApprovedAnswer } from "@/lib/assistant";

/** Edit, mark reviewed, retire or restore one approved answer. An example's text is the members' rated answer, so only its status changes. */
export function ApprovedAnswerForm({ answer }: { answer: ApprovedAnswer }) {
  const [state, action, pending] = useActionState<FormState, FormData>(changeApprovedAnswer, undefined);
  const { show } = useToast();
  const id = useId();
  const editable = answer.kind === "CORRECTION";

  useEffect(() => {
    if (state?.success) show(state.success, "success");
  }, [show, state]);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={answer.id} />
      {editable && (
        <details>
          <summary className="cursor-pointer text-sm font-medium underline underline-offset-4 hover:text-ink-soft">Edit</summary>
          <div className="mt-3 space-y-3 border-l-2 border-line pl-4">
            <div>
              <label htmlFor={`${id}-answer`} className="block text-xs font-medium">Answer</label>
              <Textarea id={`${id}-answer`} name="answer" rows={4} maxLength={MAX_CORRECTION_CHARS} defaultValue={answer.answer} className="mt-1.5" />
            </div>
            <div>
              <label htmlFor={`${id}-question`} className="block text-xs font-medium">Question it answers</label>
              <Textarea id={`${id}-question`} name="question" rows={2} maxLength={500} defaultValue={answer.question} className="mt-1.5" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor={`${id}-title`} className="block text-xs font-medium">Title</label>
                <Input id={`${id}-title`} name="title" maxLength={120} defaultValue={answer.title} className="mt-1.5" />
              </div>
              <div>
                <label htmlFor={`${id}-slugs`} className="block text-xs font-medium">Help sections it relies on</label>
                <Input id={`${id}-slugs`} name="related_slugs" defaultValue={answer.related_slugs.join(", ")} className="mt-1.5" />
              </div>
            </div>
            <Button type="submit" name="intent" value="save" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
          </div>
        </details>
      )}
      <FormMessage state={state?.error ? state : undefined} />
      <div className="flex flex-wrap gap-2">
        {answer.needs_review && answer.status === "APPROVED" && (
          <Button type="submit" name="intent" value="reviewed" variant="outline" disabled={pending}>Still right: mark reviewed</Button>
        )}
        {answer.status === "APPROVED" ? (
          <Button type="submit" name="intent" value="retire" variant="outline" disabled={pending}>Retire</Button>
        ) : (
          <Button type="submit" name="intent" value="restore" variant="outline" disabled={pending}>Restore</Button>
        )}
      </div>
    </form>
  );
}
