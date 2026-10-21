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
 * A user report's evidence bundle (S3-22), read-only: for what, about which
 * booking, when, and the conversation as it stood then. The reporter sees who
 * they reported and what they wrote. The person reported is sent it
 * anonymously (S3-23): the general cause, the booking and the conversation,
 * without who reported them or the explanation. Nothing here can be edited -
 * the bundle was frozen when the report was made.
 */
export function ReportEvidence({ report }: { report: UserReport }) {
  return (
    <div className="space-y-8">
      <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {/* The person reported is not told who reported them, or what they wrote. */}
        {report.reporter && <PartyLine label="Reported by" party={report.reporter} />}
        {report.viewer !== "REPORTED" && <PartyLine label="Reported" party={report.reported} />}
        <div>
          <dt className="eyebrow">{report.viewer === "REPORTED" ? "General cause" : "Reason"}</dt>
          <dd className="mt-1.5 text-sm">{userReportReasonLabel(report.reason_code)}</dd>
        </div>
        <div>
          <dt className="eyebrow">Reported on</dt>
          <dd className="mt-1.5 text-sm">{formatDateTime(report.created_at)}</dd>
        </div>
        {report.booking && (
          <div className="sm:col-span-2">
            <dt className="eyebrow">Booking</dt>
            <dd className="mt-1.5 text-sm">
              {report.booking.listing_name ?? "A booking"} · {formatDate(report.booking.start_date)} –{" "}
              {formatDate(report.booking.end_date)}
            </dd>
          </div>
        )}
        {report.explanation && (
          <div className="sm:col-span-2">
            <dt className="eyebrow">Explanation</dt>
            <dd className="mt-1.5 whitespace-pre-line text-sm">{report.explanation}</dd>
          </div>
        )}
      </dl>

      {report.viewer !== "REPORTED" && (
        <section aria-label="Conversation">
          <p className="eyebrow">Conversation at the time of the report</p>
          {report.messages.length === 0 ? (
            <p className="body-copy mt-3">No messages had been sent.</p>
          ) : (
            // Embedded, so a long conversation scrolls inside its own box instead
            // of lengthening the page. View only: it is the record, not a thread.
            <div className="mt-3 border border-line bg-surface-muted">
              <p className="border-b border-line bg-white px-4 py-2 text-xs text-ink-soft">
                {report.messages.length} message{report.messages.length === 1 ? "" : "s"} · view only
              </p>
              <ol className="max-h-96 space-y-3 overflow-y-auto px-4 py-4" tabIndex={0} aria-label="Messages">
                {report.messages.map((message) => {
                  const sender = message.from === "REPORTER" ? report.reporter : report.reported;
                  // The reader's own messages sit on the right, as in their own thread.
                  const mine = (message.from === "REPORTER") === (report.viewer === "REPORTER");
                  return (
                    <li key={message.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                      <p className="mb-1 text-xs text-ink-soft">
                        {mine ? "You" : (sender?.display_name ?? "The other person")} · {formatDateTime(message.sent_at)}
                      </p>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                          mine ? "bg-ink text-white" : "border border-line bg-white text-ink"
                        }`}
                      >
                        {message.body && <p className="whitespace-pre-line">{message.body}</p>}
                        {message.attachment_urls.length > 0 && (
                          <ul className="mt-2 flex flex-wrap gap-2">
                            {message.attachment_urls.map((url, index) => (
                              <li key={url}>
                                <a href={url} target="_blank" rel="noreferrer" className="block">
                                  {/* eslint-disable-next-line @next/next/no-img-element -- a short-lived signed URL */}
                                  <img src={url} alt={`Attachment ${index + 1}`} className="size-24 rounded-lg object-cover" />
                                </a>
                              </li>
                            ))}
                          </ul>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </section>
      )}
    </div>
  );
}
