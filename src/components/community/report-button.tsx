"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { Button, FormNotice, Modal, TextareaField } from "@/components/ui";
import { report } from "@/app/community/actions";
import { REPORT_REASONS, type ForumReportReason, type ForumTargetKind } from "@/lib/forum";

/** S6-11 Scenario 6: report a post or comment into the admin moderation queue. */
export function ReportButton({ kind, id }: { kind: ForumTargetKind; id: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ForumReportReason | "">("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();
  const what = kind === "POST" ? "post" : "comment";

  function submit(formData: FormData) {
    if (!reason) return setError("Choose a reason.");
    setError(null);
    startTransition(async () => {
      const result = await report(kind, id, reason, String(formData.get("explanation") ?? ""));
      if ("error" in result) setError(result.error);
      else setDone(true);
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink">
        <Flag className="size-3.5" aria-hidden="true" /> Report
      </button>
      {open && (
        <Modal title={`Report this ${what}`} onClose={() => setOpen(false)}>
          {done ? (
            <div className="space-y-4">
              <p className="body-copy">Thanks. An administrator will review this {what}. We won&rsquo;t tell the author who reported it.</p>
              <div className="flex justify-end"><Button type="button" onClick={() => setOpen(false)}>Close</Button></div>
            </div>
          ) : (
            <form action={submit} className="space-y-4">
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-ink">What&rsquo;s wrong with it?</legend>
                {REPORT_REASONS.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 text-sm text-ink">
                    <input type="radio" name="reason" value={option.value} checked={reason === option.value} onChange={() => setReason(option.value)} />
                    {option.label}
                  </label>
                ))}
              </fieldset>
              <TextareaField label="Anything else? (optional)" id={`explanation-${id}`} name="explanation" rows={3} maxLength={1000} />
              <FormNotice message={error ?? undefined} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isPending}>{isPending ? "Sending…" : "Send report"}</Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
