import Link from "next/link";
import { Panel } from "./ui";
import { formatDate, formatDateTime } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
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
export function UserReportEvidence({ report }: { report: UserReportDetail }) {
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
        {report.messages.length === 0 ? (
          <p className="text-sm text-ink-soft">No messages had been sent.</p>
        ) : (
          <ol className="space-y-3">
            {report.messages.map((message) => {
              const sender = message.from === "REPORTER" ? report.reporter : report.reported;
              return (
                <li key={message.id} className="border border-line px-4 py-3 text-sm">
                  <p className="text-xs text-ink-soft">
                    {sender.display_name ?? ROLE_LABELS[sender.role]} ({message.from === "REPORTER" ? "reporter" : "reported"}) ·{" "}
                    {formatDateTime(message.sent_at)}
                  </p>
                  {message.body && <p className="mt-1 whitespace-pre-line">{message.body}</p>}
                  {message.attachment_urls.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {message.attachment_urls.map((url, index) => (
                        <li key={url}>
                          <a href={url} target="_blank" rel="noreferrer" className="block">
                            {/* eslint-disable-next-line @next/next/no-img-element -- a short-lived signed URL */}
                            <img src={url} alt={`Attachment ${index + 1}`} className="size-24 border border-line object-cover" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </Panel>
    </div>
  );
}
