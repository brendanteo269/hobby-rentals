"use client";

import { useState, useTransition } from "react";
import { Button, FormNotice, Modal, SelectField, TextareaField } from "@/components/ui";
import { submitListingReport } from "@/app/listings/[id]/report-actions";
import { LISTING_REPORT_REASONS, type ListingReportReason } from "@/lib/reports";

/**
 * S3-21 Scenario 1: report a listing with a reason and an optional
 * explanation. Our team reviews it with the reporter's booking and
 * conversation with the owner attached; the owner is told it is under review
 * but not who reported it.
 */
export function ReportListingButton({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ListingReportReason>(LISTING_REPORT_REASONS[0].value);
  const [explanation, setExplanation] = useState("");
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(undefined);
    startTransition(async () => {
      const result = await submitListingReport(listingId, reason, explanation);
      if ("error" in result) {
        // Scenario 3: a repeat is not an error to the reporter - their first report stands.
        if (result.code === "ALREADY_REPORTED") setDone(result.error);
        else setError(result.error);
        return;
      }
      setDone("Thanks - your report is with our team. We'll look into it.");
    });
  }

  return (
    <>
      <button type="button" className="text-sm text-ink-soft underline hover:text-ink" onClick={() => setOpen(true)}>
        Report listing
      </button>
      {open && (
        <Modal title="Report this listing" onClose={() => setOpen(false)}>
          {done ? (
            <div className="mt-4 space-y-4 text-sm">
              <FormNotice tone="success" message={done} />
              <div className="flex justify-end">
                <Button onClick={() => setOpen(false)}>Close</Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-4 text-sm">
              <p className="text-ink-soft">
                Our team reviews every report. The owner is told their listing is under review, but not who reported it.
              </p>
              <SelectField
                id="report-reason"
                label="What's wrong?"
                value={reason}
                onChange={(event) => setReason(event.target.value as ListingReportReason)}
                required
              >
                {LISTING_REPORT_REASONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
              <TextareaField
                id="report-explanation"
                label="Anything else we should know? (optional)"
                rows={4}
                maxLength={1000}
                value={explanation}
                onChange={(event) => setExplanation(event.target.value)}
              />
              <FormNotice message={error} />
              <div className="flex justify-end gap-2">
                <Button variant="outline" disabled={isPending} onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button disabled={isPending} onClick={submit}>
                  {isPending ? "Sending…" : "Send report"}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
