"use client";

import { useActionState } from "react";
import { Button, FormError, TextareaField } from "@/components/ui";
import { submitStolenReport } from "@/app/listings/[id]/passport/actions";

/** S2-37: permanent, so it asks once more before submitting. */
export function StolenReportForm({ listingId }: { listingId: string }) {
  const [state, formAction, pending] = useActionState(submitStolenReport.bind(null, listingId), undefined);

  return (
    <form
      action={formAction}
      className="space-y-4"
      onSubmit={(event) => {
        if (!window.confirm("Report this item stolen? Its listing is archived for good. This can't be undone.")) {
          event.preventDefault();
        }
      }}
    >
      <TextareaField
        label="What happened?"
        id="stolen-note"
        name="note"
        maxLength={1000}
        required
        rows={3}
        placeholder="When and where it was taken, and any police report number."
      />
      <FormError message={state?.error} />
      <Button variant="outline" disabled={pending}>{pending ? "Reporting…" : "Report stolen"}</Button>
    </form>
  );
}
