"use client";

import { useState, useTransition } from "react";
import { Button, FormNotice, Modal, SelectField, TextareaField } from "@/components/ui";
import { useToast } from "@/components/toast";
import { submitUserReport } from "@/app/messages/[id]/report-actions";
import { USER_REPORT_REASONS, type UserReportReason } from "@/lib/reports";

/**
 * S3-22 Scenario 1: the form to report the other person in a booking
 * conversation, with a reason and a compulsory explanation. The whole
 * conversation is attached as evidence for our team, which reviews it first;
 * the form says so before anything is sent. The outcome is a toast, like every
 * other confirmation in the app, and the form closes behind it.
 */
export function ReportUserModal({
  conversationId,
  otherPartyName,
  onClose,
}: {
  conversationId: string;
  otherPartyName: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<UserReportReason>(USER_REPORT_REASONS[0].value);
  const [explanation, setExplanation] = useState("");
  const [error, setError] = useState<string>();
  const { show } = useToast();
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(undefined);
    if (!explanation.trim()) {
      setError("Tell us what happened.");
      return;
    }
    startTransition(async () => {
      const result = await submitUserReport(conversationId, reason, explanation);
      if ("error" in result) {
        // A repeat is not an error to the reporter - their first report stands.
        if (result.code === "ALREADY_REPORTED") {
          show(result.error, "info");
          onClose();
        } else {
          setError(result.error);
        }
        return;
      }
      show("Report sent. Our team will review it with this conversation attached.", "success");
      onClose();
    });
  }

  return (
    <Modal title={`Report ${otherPartyName}`} onClose={onClose}>
      <div className="mt-4 space-y-4 text-sm">
        <p className="text-ink-soft">
          This whole conversation is sent to our team with your report. They review it first, and {otherPartyName}{" "}
          is told only if they find it to be valid.
        </p>
        <SelectField
          id="user-report-reason"
          label="What happened?"
          value={reason}
          onChange={(event) => setReason(event.target.value as UserReportReason)}
          required
        >
          {USER_REPORT_REASONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
        <TextareaField
          id="user-report-explanation"
          label="Explain what happened"
          rows={4}
          maxLength={1000}
          required
          value={explanation}
          onChange={(event) => setExplanation(event.target.value)}
        />
        <FormNotice message={error} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={isPending} onClick={submit}>
            {isPending ? "Sending…" : "Send report"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
