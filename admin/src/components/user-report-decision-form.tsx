"use client";

import { useActionState, useEffect } from "react";
import { Button, FormMessage, Panel, RequiredMark, Textarea } from "./ui";
import { useToast } from "./toast";
import { STRIKE_LIMIT, SUSPENSION_DAYS } from "@/lib/moderation";
import { decideUserReport, type DecideReportState } from "@/app/moderation/[id]/actions";

/**
 * An administrator's decision on a user report (S3-22, S3-23): warn the user,
 * which sends them the report and adds a strike (three suspend the account),
 * or dismiss it, which never tells them. Either needs a reason, which is kept
 * in the audit trail and not shown to either member.
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
      description={`Warn the user if the claim is true: the report is sent to them and a strike is added against their account, which they are not shown. Strike ${STRIKE_LIMIT} suspends the account for ${SUSPENSION_DAYS} days. Dismiss it if not: the reported user is never told. The reporter hears the outcome either way.`}
    >
      <form
        action={action}
        className="space-y-5"
        onSubmit={(event) => {
          const intent = ((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value;
          const message =
            intent === "warn"
              ? "Warn this user and send them the report? A strike is added, and strike " + STRIKE_LIMIT + " suspends the account. This can't be undone."
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
          <Button type="submit" name="intent" value="warn" disabled={pending}>
            Warn user
          </Button>
          <Button type="submit" name="intent" value="dismiss" variant="outline" disabled={pending}>
            Dismiss
          </Button>
        </div>
      </form>
    </Panel>
  );
}
