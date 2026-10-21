"use client";

import { useActionState, useEffect } from "react";
import { Badge, Button, Panel, Textarea } from "./ui";
import { useToast } from "./toast";
import { decideListingReportAction, type ReportDecisionState } from "@/app/listings/[id]/report-actions";
import { formatDate, formatDateTime, shortId } from "@/lib/format";
import { LISTING_REPORT_REASON_LABELS, REPORT_STATUS, type ListingReport } from "@/lib/reports";
import type { ReportAssessment } from "@/lib/moderation";
import { ReopenAiDismissalForm } from "./reopen-ai-dismissal-form";
import { ReportAssessmentSummary } from "./report-assessment-summary";
import { ROUTES } from "@/lib/routes";

/**
 * S3-21: the reports members made on this listing, each with its evidence
 * bundle - reason, explanation, the reporter's booking and their conversation
 * with the owner, as captured when the report was made - and, while open, the
 * decision: dismiss it, or deactivate the listing.
 */
export function ListingReportsPanel({
  listingId,
  reports,
  assessments = {},
}: {
  listingId: string;
  reports: ListingReport[];
  /** What the AI made of each report, by report id; advice shown above the decision. */
  assessments?: Record<string, ReportAssessment | null>;
}) {
  if (reports.length === 0) return null;
  const open = reports.filter((report) => report.status === "OPEN").length;
  return (
    <Panel
      title="Reports"
      description={open ? `${open} report${open === 1 ? "" : "s"} awaiting review.` : "All reports on this listing have been decided."}
    >
      <ul className="-mx-6 -my-5 divide-y divide-line">
        {reports.map((report) => (
          <li key={report.id} className="space-y-3 px-6 py-4">
            <ReportDetails report={report} />
            <ReportAssessmentSummary assessment={assessments[report.id]} />
            {report.status === "OPEN" ? (
              <DecisionForm listingId={listingId} reportId={report.id} />
            ) : report.decision_by === "AI" && report.status === "DISMISSED" ? (
              <ReopenAiDismissalForm reportId={report.id} />
            ) : (
              <p className="border-l-2 border-line bg-sand px-3 py-2 text-sm">
                <span className="font-medium">Decided {report.resolved_at ? formatDateTime(report.resolved_at) : ""}: </span>
                {report.resolution_note}
              </p>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function ReportDetails({ report }: { report: ListingReport }) {
  const status = REPORT_STATUS[report.status];
  const booking = report.evidence.booking;
  const conversation = report.evidence.conversation ?? [];
  return (
    <div className="space-y-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{LISTING_REPORT_REASON_LABELS[report.reason_code] ?? report.reason_code}</span>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <p className="text-xs text-ink-soft">
        Reported {formatDateTime(report.created_at)} by {report.reporter_name ?? "a member"} ({shortId(report.reporter_id)})
        {booking ? (
          <>
            {" "}
            · booking{" "}
            <a href={ROUTES.booking(booking.id)} className="underline">
              {shortId(booking.id)}
            </a>{" "}
            ({booking.status.toLowerCase()}, {formatDate(booking.start_date)} – {formatDate(booking.end_date)})
          </>
        ) : (
          " · no booking of this listing"
        )}
      </p>
      {report.explanation && <p className="whitespace-pre-line text-ink">&ldquo;{report.explanation}&rdquo;</p>}
      <details>
        <summary className="cursor-pointer text-xs text-ink-soft">
          Conversation with the owner ({conversation.length} message{conversation.length === 1 ? "" : "s"})
        </summary>
        {conversation.length === 0 ? (
          <p className="mt-2 text-xs text-ink-soft">The reporter had not messaged the owner.</p>
        ) : (
          <ol className="mt-2 space-y-1 border-l-2 border-line pl-3">
            {conversation.map((message, index) => (
              <li key={index} className="text-xs">
                <span className="font-medium">{message.from === "OWNER" ? "Owner" : "Reporter"}</span>{" "}
                <span className="text-ink-soft">{formatDateTime(message.sent_at)}</span>
                <span className="block whitespace-pre-line text-ink">
                  {message.body}
                  {message.attachments > 0 && ` (+${message.attachments} attachment${message.attachments === 1 ? "" : "s"})`}
                </span>
              </li>
            ))}
          </ol>
        )}
      </details>
    </div>
  );
}

function DecisionForm({ listingId, reportId }: { listingId: string; reportId: string }) {
  const [state, action, pending] = useActionState<ReportDecisionState, FormData>(decideListingReportAction, undefined);
  const { show } = useToast();
  useEffect(() => {
    const message = state?.success ?? state?.error;
    if (message) show(message, state?.error ? "error" : "success");
  }, [show, state]);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="report_id" value={reportId} />
      <input type="hidden" name="listing_id" value={listingId} />
      <label htmlFor={`reason-${reportId}`} className="text-xs font-medium">
        Decision reason (required; shown to the owner if you deactivate)
      </label>
      <Textarea id={`reason-${reportId}`} name="reason" rows={2} maxLength={1000} required />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="decision" value="DISMISS" variant="outline" disabled={pending}>
          Dismiss report
        </Button>
        <Button type="submit" name="decision" value="DEACTIVATE" disabled={pending}>
          {pending ? "Saving…" : "Deactivate listing"}
        </Button>
      </div>
    </form>
  );
}
