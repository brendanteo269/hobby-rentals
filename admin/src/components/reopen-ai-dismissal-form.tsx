"use client";

import { useActionState, useEffect } from "react";
import { Button, FormMessage, Panel, RequiredMark, Textarea } from "./ui";
import { useToast } from "./toast";
import { reopenAiDismissal, type DecideReportState } from "@/app/moderation/[id]/actions";

/**
 * Takes a report the AI dismissed back to the queue for a person to decide. A
 * reason is required and goes in the audit trail. The result is a toast:
 * reopening moves the report out of this state, so the page stops rendering
 * this panel.
 */
export function ReopenAiDismissalForm({ reportId }: { reportId: string }) {
  const [state, action, pending] = useActionState<DecideReportState, FormData>(reopenAiDismissal, undefined);
  const { show } = useToast();

  useEffect(() => {
    if (state?.success) show(state.success, "success");
  }, [show, state]);

  return (
    <Panel
      title="Dismissed by AI"
      description="No person looked at this report. If the dismissal looks wrong, reopen it and decide it yourself. The reporter has already been told it was dismissed."
    >
      <form action={action} className="space-y-4">
        <input type="hidden" name="report_id" value={reportId} />
        <div>
          <label htmlFor="reopen-note" className="block text-sm font-medium">
            Why reopen it
            <RequiredMark />
          </label>
          <Textarea id="reopen-note" name="note" required rows={2} className="mt-2" />
        </div>
        <FormMessage state={state?.error ? state : undefined} />
        <Button type="submit" variant="outline" disabled={pending}>
          Reopen report
        </Button>
      </form>
    </Panel>
  );
}
