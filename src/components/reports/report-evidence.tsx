import { formatDate, formatDateTime } from "@/lib/format";
import { userReportReasonLabel, type ReportParty, type UserReport } from "@/lib/reports";

const ROLE_LABELS: Record<ReportParty["role"], string> = { RENTER: "Renter", OWNER: "Owner" };

function PartyLine({ label, party }: { label: string; party: ReportParty }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1.5 text-sm">
        {party.display_name ?? "A member"} <span className="text-ink-soft">· {ROLE_LABELS[party.role]}</span>
      </dd>
    </div>
  );
}

/**
 * A user report's evidence bundle (S3-22), read-only: who reported whom, for
 * what, about which booking, when, and the conversation as it stood then.
 * Shown to the reporter and to the person reported. Nothing here can be edited
 * - the bundle was frozen when the report was made.
 */
export function ReportEvidence({ report }: { report: UserReport }) {
  const reporter = report.reporter;
  return (
    <div className="space-y-8">
      <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        <PartyLine label="Reported by" party={reporter} />
        <PartyLine label="Reported" party={report.reported} />
        <div>
          <dt className="eyebrow">Reason</dt>
          <dd className="mt-1.5 text-sm">{userReportReasonLabel(report.reason_code)}</dd>
        </div>
        <div>
          <dt className="eyebrow">Reported on</dt>
          <dd className="mt-1.5 text-sm">{formatDateTime(report.created_at)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="eyebrow">Booking</dt>
          <dd className="mt-1.5 text-sm">
            {report.booking.listing_name ?? "A booking"} · {formatDate(report.booking.start_date)} –{" "}
            {formatDate(report.booking.end_date)}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="eyebrow">Explanation</dt>
          <dd className="mt-1.5 whitespace-pre-line text-sm">{report.explanation}</dd>
        </div>
      </dl>

      <section aria-label="Conversation">
        <p className="eyebrow">Conversation at the time of the report</p>
        {report.messages.length === 0 ? (
          <p className="body-copy mt-3">No messages had been sent.</p>
        ) : (
          <ol className="mt-4 space-y-3">
            {report.messages.map((message) => {
              const sender = message.from === "REPORTER" ? report.reporter : report.reported;
              return (
                <li key={message.id} className="border border-line bg-white px-4 py-3 text-sm">
                  <p className="text-xs text-ink-soft">
                    {sender.display_name ?? ROLE_LABELS[sender.role]} · {formatDateTime(message.sent_at)}
                  </p>
                  {message.body && <p className="mt-1 whitespace-pre-line">{message.body}</p>}
                  {message.attachment_urls.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {message.attachment_urls.map((url, index) => (
                        <li key={url}>
                          <a href={url} target="_blank" rel="noreferrer" className="block">
                            {/* eslint-disable-next-line @next/next/no-img-element -- a short-lived signed URL */}
                            <img
                              src={url}
                              alt={`Attachment ${index + 1}`}
                              className="size-24 border border-line object-cover"
                            />
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
      </section>
    </div>
  );
}
