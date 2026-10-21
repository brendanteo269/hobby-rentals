"use client";

import { useEffect, useState } from "react";
import { Button } from "./ui";
import { formatDateTime } from "@/lib/format";
import type { ReportParty, UserReportDetail } from "@/lib/reports";

const ROLE_LABELS: Record<ReportParty["role"], string> = { RENTER: "Renter", OWNER: "Owner" };

/**
 * The conversation attached to a report, as a view-only chat in a dialog: a
 * long conversation scrolls inside it instead of lengthening the page. The
 * reporter's messages sit on the right and the reported person's on the left,
 * as in the members' own thread, but there is no way to reply, edit or remove
 * anything - this is evidence as it stood when the report was made. Messages
 * the AI relied on are marked so the administrator can go straight to them.
 */
export function ConversationLogModal({
  report,
  relied = [],
}: {
  report: UserReportDetail;
  /** 1-based positions of the messages the AI relied on. */
  relied?: number[];
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const count = report.messages.length;
  return (
    <>
      {count === 0 ? (
        <p className="text-sm text-ink-soft">No messages had been sent.</p>
      ) : (
        <Button variant="outline" onClick={() => setOpen(true)}>
          View conversation ({count} message{count === 1 ? "" : "s"})
        </Button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          role="presentation"
          onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="conversation-log-title"
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-sm border border-line bg-white shadow-xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
              <div>
                <h2 id="conversation-log-title" className="display-caps text-lg">
                  Conversation
                </h2>
                <p className="mt-1 text-xs text-ink-soft">
                  {report.reporter.display_name ?? "The reporter"} (reporter) and {report.reported.display_name ?? "the reported person"}{" "}
                  (reported). View only
                  {report.captured_at ? `, as it stood on ${formatDateTime(report.captured_at)}` : ""}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close conversation"
                className="text-ink-soft transition-colors hover:text-ink"
              >
                <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                  <path d="M5 5l10 10M15 5L5 15" />
                </svg>
              </button>
            </div>

            <ol className="flex-1 space-y-3 overflow-y-auto bg-sand px-6 py-5">
              {report.messages.map((message, index) => {
                const fromReporter = message.from === "REPORTER";
                const sender = fromReporter ? report.reporter : report.reported;
                const marked = relied.includes(index + 1);
                return (
                  <li key={message.id} className={`flex flex-col ${fromReporter ? "items-end" : "items-start"}`}>
                    <p className="mb-1 text-xs text-ink-soft">
                      {index + 1}. {sender.display_name ?? ROLE_LABELS[sender.role]} · {formatDateTime(message.sent_at)}
                      {marked && <span className="ml-1 font-medium text-clay">· AI relied on this</span>}
                    </p>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        fromReporter ? "bg-ink text-cream" : "border border-line bg-white"
                      } ${marked ? "ring-2 ring-clay" : ""}`}
                    >
                      {message.body && <p className="whitespace-pre-line">{message.body}</p>}
                      {message.attachment_urls.length > 0 && (
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {message.attachment_urls.map((url, photo) => (
                            <li key={url}>
                              <a href={url} target="_blank" rel="noreferrer" className="block">
                                {/* eslint-disable-next-line @next/next/no-img-element -- a short-lived signed URL */}
                                <img src={url} alt={`Attachment ${photo + 1}`} className="size-28 rounded-lg object-cover" />
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
        </div>
      )}
    </>
  );
}
