import Link from "next/link";
import { Panel } from "./ui";
import { formatDate, formatDateTime } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { ConversationLogModal } from "./conversation-log-modal";
import { USER_REPORT_REASON_LABELS, type ReportParty, type UserReportDetail } from "@/lib/reports";

const ROLE_LABELS: Record<ReportParty["role"], string> = { RENTER: "Renter", OWNER: "Owner" };

function Party({ label, party }: { label: string; party: ReportParty }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="mt-1.5 text-sm">
        <Link href={ROUTES.user(party.id)} className="underline underline-offset-4">
          {party.display_name ?? "No name"}
        </Link>{" "}
        <span className="text-ink-soft">· {ROLE_LABELS[party.role]}</span>
      </p>
    </div>
  );
}

/**
 * A user report's evidence bundle (S3-22), read-only: the report as made, and
 * the conversation as it stood when it was. If the report is upheld the
 * reported user reads this same bundle.
 */
export function UserReportEvidence({ report, relied = [] }: { report: UserReportDetail; /** 1-based positions of the messages the AI relied on, marked in the log. */ relied?: number[] }) {
  return (
    <div className="space-y-6">
      <Panel title="Report" description={`Made ${formatDateTime(report.created_at)}.`}>
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <Party label="Reported by" party={report.reporter} />
          <Party label="Reported" party={report.reported} />
          <div>
            <p className="eyebrow">Reason</p>
            <p className="mt-1.5 text-sm">{USER_REPORT_REASON_LABELS[report.reason_code] ?? report.reason_code}</p>
          </div>
          <div>
            <p className="eyebrow">Booking</p>
            <p className="mt-1.5 text-sm">
              <Link href={ROUTES.booking(report.booking.id)} className="underline underline-offset-4">
                {report.booking.listing_name ?? "Booking"}
              </Link>{" "}
              <span className="text-ink-soft">
                · {formatDate(report.booking.start_date)} – {formatDate(report.booking.end_date)}
              </span>
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="eyebrow">Explanation</p>
            <p className="mt-1.5 whitespace-pre-line text-sm">{report.explanation}</p>
          </div>
        </div>
      </Panel>

      <Panel
        title="Conversation"
        description={`${report.messages.length} message${report.messages.length === 1 ? "" : "s"}, as they stood${
          report.captured_at ? ` on ${formatDateTime(report.captured_at)}` : ""
        }.`}
      >
        <ConversationLogModal report={report} relied={relied} />
      </Panel>
    </div>
  );
}
