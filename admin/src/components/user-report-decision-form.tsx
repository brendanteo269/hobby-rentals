"use client";

import { useActionState, useEffect } from "react";
import { Button, FormMessage, Panel, RequiredMark, Select, Textarea } from "./ui";
import { useToast } from "./toast";
import { STRIKE_LIMIT, SUSPENSION_DAYS } from "@/lib/moderation";
import { decideUserReport, type DecideReportState } from "@/app/moderation/[id]/actions";

/**
 * An administrator's decision on a user report (S3-22, S3-23): dismiss it, or
 * acknowledge it as true. Acknowledging sends the report to the reported user
 * and adds a strike they are not shown (strike STRIKE_LIMIT suspends the
 * account); dismissing tells only the reporter, that nothing substantial was
 * found. Either needs a comment, which is kept in the audit trail and not
 * shown to either member. The result is a toast: deciding closes the report,
 * so the page stops rendering this panel.
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
      description="Choose an outcome and say why. Both are recorded in the audit trail, and the reporter is told the result either way."
    >
      <form
        action={action}
        className="space-y-5"
        onSubmit={(event) => {
          const intent = new FormData(event.currentTarget).get("intent");
          const message =
            intent === "warn"
              ? `Acknowledge this report? The reported user is sent it and a strike is added; strike ${STRIKE_LIMIT} suspends the account for ${SUSPENSION_DAYS} days. This can't be undone.`
              : "Dismiss this report? The reported user will not be told. This can't be undone.";
          if (!window.confirm(message)) event.preventDefault();
        }}
      >
        <input type="hidden" name="report_id" value={reportId} />

        <div>
          <label htmlFor="intent" className="block text-sm font-medium">
            Decision
            <RequiredMark />
          </label>
          <Select id="intent" name="intent" required defaultValue="" className="mt-2">
            <option value="" disabled>
              Choose a decision…
            </option>
            <option value="dismiss">Dismiss report: the reporter is told nothing substantial was found</option>
            <option value="warn">
              Acknowledge report: the claim is true, the reported user is sent it and a strike is added
            </option>
          </Select>
        </div>

        <div>
          <label htmlFor="note" className="block text-sm font-medium">
            Comments
            <RequiredMark />
          </label>
          <Textarea
            id="note"
            name="note"
            required
            rows={3}
            className="mt-2"
            placeholder="What you found in the conversation. Stored in the audit trail, not shown to either person."
          />
        </div>

        <FormMessage state={state?.error ? state : undefined} />

        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Submit decision"}
        </Button>
      </form>
    </Panel>
  );
}
