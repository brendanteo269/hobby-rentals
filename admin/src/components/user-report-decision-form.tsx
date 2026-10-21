"use client";

import { useActionState, useEffect } from "react";
import { Button, FormMessage, Panel, RequiredMark, Textarea } from "./ui";
import { useToast } from "./toast";
import { decideUserReport, type DecideReportState } from "@/app/reports/[id]/actions";

/**
 * An administrator's decision on a user report (S3-22): uphold it, which sends
 * it to the reported user, or dismiss it, which never tells them. Either needs
 * a reason, which is kept in the audit trail and not shown to either member.
 * The result is a toast: deciding closes the report, so the page stops
 * rendering this panel.
 */
export function UserReportDecisionForm({ reportId }: { reportId: string }) {
  const [state, action, pending] = useActionState<DecideReportState, FormData>(decideUserReport, undefined);
  const { show } = useToast();

  useEffect(() => {
    if (state?.success) show(state.success, "success");
  }, [show, state]);

  return (
    <Panel
      title="Decide"
      description="Uphold the report if the claim is true: it is then sent to the reported user, who is told and can read it. Dismiss it if not: the reported user is never told. The reporter hears the outcome either way."
    >
      <form
        action={action}
        className="space-y-5"
        onSubmit={(event) => {
          const intent = ((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value;
          const message =
            intent === "uphold"
              ? "Uphold this report and send it to the reported user? This can't be undone."
              : "Dismiss this report? The reported user will not be told. This can't be undone.";
          if (!window.confirm(message)) event.preventDefault();
        }}
      >
        <input type="hidden" name="report_id" value={reportId} />
        <div>
          <label htmlFor="note" className="block text-sm font-medium">
            Reason
            <RequiredMark />
          </label>
          <Textarea
            id="note"
            name="note"
            required
            rows={3}
            className="mt-2"
            placeholder="What you found in the conversation, for the audit trail."
          />
        </div>

        <FormMessage state={state?.error ? state : undefined} />

        <div className="flex flex-wrap gap-3">
          <Button type="submit" name="intent" value="uphold" disabled={pending}>
            Uphold and send
          </Button>
          <Button type="submit" name="intent" value="dismiss" variant="outline" disabled={pending}>
            Dismiss
          </Button>
        </div>
      </form>
    </Panel>
  );
}
