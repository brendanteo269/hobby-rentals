"use client";

import { useActionState, useEffect } from "react";
import { Button, FormMessage, RequiredMark, Textarea } from "./ui";
import { useToast } from "./toast";
import { reopenAiDismissal, type ReopenState } from "@/app/reports/actions";

/**
 * Takes a report the AI dismissed back to the queue for a person to decide. A
 * comment is required and goes in the audit trail. The result is a toast:
 * reopening moves the report out of this state, so the page stops offering it.
 */
export function ReopenAiDismissalForm({ reportId }: { reportId: string }) {
  const [state, action, pending] = useActionState<ReopenState, FormData>(reopenAiDismissal, undefined);
  const { show } = useToast();

  useEffect(() => {
    if (state?.success) show(state.success, "success");
  }, [show, state]);

  return (
    <form action={action} className="space-y-3 border-l-2 border-clay bg-sand px-4 py-3">
      <input type="hidden" name="report_id" value={reportId} />
      <p className="text-sm">
        <span className="font-medium">Dismissed by AI.</span> No person looked at this report, and the reporter has already
        been told it was dismissed. If that looks wrong, reopen it and decide it yourself.
      </p>
      <div>
        <label htmlFor={`reopen-${reportId}`} className="block text-xs font-medium">
          Why reopen it
          <RequiredMark />
        </label>
        <Textarea id={`reopen-${reportId}`} name="note" required rows={2} className="mt-1.5" />
      </div>
      <FormMessage state={state?.error ? state : undefined} />
      <Button type="submit" variant="outline" disabled={pending}>
        Reopen report
      </Button>
    </form>
  );
}
