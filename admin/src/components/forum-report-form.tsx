"use client";

import { useActionState, useEffect } from "react";
import { Button, FormMessage, RequiredMark, Textarea } from "./ui";
import { useToast } from "./toast";
import { decideForumReport, type ForumDecisionState } from "@/app/community/actions";

/** S6-11 Scenario 6: an administrator removes the reported content or dismisses the report, with a reason. */
export function ForumReportForm({ reportId, what }: { reportId: string; what: string }) {
  const [state, action, pending] = useActionState<ForumDecisionState, FormData>(decideForumReport, undefined);
  const { show } = useToast();

  useEffect(() => {
    if (state?.success) show(state.success, "success");
  }, [show, state]);

  return (
    <form action={action} className="mt-3 space-y-3">
      <input type="hidden" name="report_id" value={reportId} />
      <div>
        <label htmlFor={`note-${reportId}`} className="block text-xs font-medium">
          Reason (shown to the author if removed)
          <RequiredMark />
        </label>
        <Textarea id={`note-${reportId}`} name="note" required rows={2} className="mt-1.5" />
      </div>
      <FormMessage state={state?.error ? state : undefined} />
      <div className="flex gap-2">
        <Button type="submit" name="decision" value="REMOVE" disabled={pending}>Remove {what}</Button>
        <Button type="submit" name="decision" value="DISMISS" variant="outline" disabled={pending}>Dismiss report</Button>
      </div>
    </form>
  );
}
