import Link from "next/link";
import { Badge, DescriptionList, Panel } from "./ui";
import { ConversationLogModal } from "./conversation-log-modal";
import { ReopenAiDismissalForm } from "./reopen-ai-dismissal-form";
import { ReportAssessmentPanel } from "./report-assessment-panel";
import { UserReportDecisionForm } from "./user-report-decision-form";
import { DECISION_LABELS, type ReportAssessment } from "@/lib/moderation";
import { USER_REPORT_REASON_LABELS, USER_REPORT_STATUS, type UserReportDetail } from "@/lib/reports";
import { formatDate, formatDateTime, shortId } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { userReportPath } from "./user-view-tabs";

/**
 * The reports members made about this member (S3-22, S3-23), one at a time: a
 * member reported more than once would otherwise be a long stack of cases, so
 * the Reports tab shows the selected report and steps through the rest with
 * previous and next, open ones first. Each case is laid out as its own
 * sections - the report, what the AI made of it, the conversation attached to
 * it, and the decision - so an administrator reads one thing at a time. The
 * queue of what is waiting is at the top of the user list. The decision is the
 * administrator's: acknowledging a report adds a strike the member is never
 * shown.
 */
export function UserReportsPanel({
  userId,
  reports,
  selectedIndex,
  assessment,
}: {
  userId: string;
  reports: UserReportDetail[];
  /** Which of `reports` is shown. */
  selectedIndex: number;
  /** What the AI made of the selected report. */
  assessment: ReportAssessment | null | undefined;
}) {
  if (reports.length === 0) {
    return (
      <Panel title="Reports" description="Nothing has been reported about this member.">
        <p className="text-sm text-ink-soft">User reports made about them appear here.</p>
      </Panel>
    );
  }
  const report = reports[selectedIndex] ?? reports[0];
  const index = reports.indexOf(report);
  return (
    <div className="space-y-6">
      {reports.length > 1 && <ReportPager userId={userId} reports={reports} index={index} />}
      <ReportCase userId={userId} report={report} assessment={assessment} />
    </div>
  );
}

/** Previous and next through the member's reports, with where you are and what each one's state is. */
function ReportPager({ userId, reports, index }: { userId: string; reports: UserReportDetail[]; index: number }) {
  const previous = reports[index - 1];
  const next = reports[index + 1];
  const open = reports.filter((report) => report.status === "OPEN").length;
  const arrow = "flex size-9 items-center justify-center rounded-sm border border-line bg-white text-lg leading-none transition-colors";
  return (
    <nav aria-label="Reports about this member" className="flex flex-wrap items-center justify-between gap-3 border border-line bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        {previous ? (
          <Link href={userReportPath(userId, previous.id)} aria-label="Previous report" className={`${arrow} hover:bg-sand`}>
            <span aria-hidden="true">‹</span>
          </Link>
        ) : (
          <span aria-hidden="true" className={`${arrow} cursor-not-allowed text-ink-soft/40`}>
            ‹
          </span>
        )}
        <p className="text-sm">
          <span className="font-medium">
            Report {index + 1} of {reports.length}
          </span>
          <span className="ml-2 text-ink-soft">{open ? `${open} awaiting a decision` : "all decided"}</span>
        </p>
        {next ? (
          <Link href={userReportPath(userId, next.id)} aria-label="Next report" className={`${arrow} hover:bg-sand`}>
            <span aria-hidden="true">›</span>
          </Link>
        ) : (
          <span aria-hidden="true" className={`${arrow} cursor-not-allowed text-ink-soft/40`}>
            ›
          </span>
        )}
      </div>
      <ol className="flex items-center gap-1.5" aria-label="Jump to a report">
        {reports.map((report, position) => (
          <li key={report.id}>
            <Link
              href={userReportPath(userId, report.id)}
              aria-label={`Report ${position + 1}: ${USER_REPORT_STATUS[report.status].label}`}
              aria-current={position === index ? "true" : undefined}
              title={`${USER_REPORT_REASON_LABELS[report.reason_code] ?? report.reason_code} · ${USER_REPORT_STATUS[report.status].label}`}
              className={`block size-3 rounded-full border transition-colors ${
                position === index ? "border-ink" : "border-line hover:border-ink-soft"
              } ${report.status === "OPEN" ? "bg-clay" : "bg-stone"}`}
            />
          </li>
        ))}
      </ol>
    </nav>
  );
}

function ReportCase({
  userId,
  report,
  assessment,
}: {
  userId: string;
  report: UserReportDetail;
  assessment: ReportAssessment | null | undefined;
}) {
  const status = USER_REPORT_STATUS[report.status];
  const decided = report.status !== "OPEN";
  return (
    <section id={`report-${report.id}`} className="scroll-mt-24 space-y-4" aria-label={`Report ${shortId(report.id)}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Report {shortId(report.id)}</p>
          <h2 className="display-caps mt-1 text-xl">{USER_REPORT_REASON_LABELS[report.reason_code] ?? report.reason_code}</h2>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      <Panel title="Report">
        <DescriptionList
          items={[
            {
              term: "Reported by",
              value: (
                <Link href={ROUTES.user(report.reporter.id)} className="underline underline-offset-4">
                  {report.reporter.display_name ?? "A member"}
                </Link>
              ),
            },
            { term: "Submitted", value: formatDateTime(report.created_at) },
            {
              term: "Booking",
              value: (
                <>
                  <Link href={ROUTES.booking(report.booking.id)} className="underline underline-offset-4">
                    {report.booking.listing_name ?? shortId(report.booking.id)}
                  </Link>{" "}
                  <span className="text-ink-soft">
                    · {formatDate(report.booking.start_date)} – {formatDate(report.booking.end_date)}
                  </span>
                </>
              ),
            },
            { term: "Explanation", value: <span className="whitespace-pre-line">{report.explanation}</span> },
          ]}
        />
      </Panel>

      <ReportAssessmentPanel assessment={assessment} />

      <Panel title="Conversation" description={report.captured_at ? `As of ${formatDateTime(report.captured_at)}` : undefined}>
        <ConversationLogModal report={report} relied={assessment?.cited_messages ?? []} />
      </Panel>

      {!decided ? (
        <Panel
          title="Decide"
          description="Choose an outcome and say why. Both are recorded in the audit trail, and the reporter is told the result either way."
        >
          <UserReportDecisionForm reportId={report.id} userId={userId} />
        </Panel>
      ) : report.decision_by === "AI" && report.status === "DISMISSED" ? (
        <Panel title="Decision" description={`Dismissed by AI, ${formatDateTime(report.resolved_at)}.`}>
          <p className="mb-4 whitespace-pre-line text-sm">{report.resolution_note}</p>
          <ReopenAiDismissalForm reportId={report.id} />
        </Panel>
      ) : (
        <Panel
          title="Decision"
          description={`${report.status === "ACTIONED" ? DECISION_LABELS.WARN : DECISION_LABELS.DISMISS}, ${formatDateTime(report.resolved_at)}.`}
        >
          <p className="eyebrow">Comments</p>
          <p className="mt-1.5 whitespace-pre-line text-sm">{report.resolution_note}</p>
        </Panel>
      )}
    </section>
  );
}
