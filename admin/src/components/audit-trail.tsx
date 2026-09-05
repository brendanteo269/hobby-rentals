import { EmptyState, Panel } from "./ui";
import { Pagination } from "./pagination";
import { formatDateTime } from "@/lib/format";
import type { AuditEntry } from "@/lib/audit";

/**
 * What administrators have done to this account, newest first.
 *
 * Shown on the account itself rather than in a separate log, because the
 * question it answers — "has somebody already dealt with this?" — is asked
 * while looking at the member, not while auditing the platform.
 */
export function AuditTrail({
  entries,
  page,
  lastPage,
  hrefForPage,
}: {
  entries: AuditEntry[];
  page: number;
  lastPage: number;
  hrefForPage: (page: number) => string;
}) {
  return (
    <Panel title="Admin activity" description="Actions taken on this account by staff.">
      {entries.length === 0 ? (
        <div className="-mx-6 -my-5">
          <EmptyState
            title="Nothing recorded"
            body="Administrator actions on this account will be listed here."
          />
        </div>
      ) : (
        <>
          <ol className="space-y-4">
            {entries.map((entry) => (
              <li key={entry.id} className="border-l-2 border-line pl-4">
                <p className="text-sm font-medium">{entry.label}</p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {entry.actorLabel} · {formatDateTime(entry.created_at)}
                </p>
                {entry.detail.email_sent === false && (
                  <p className="mt-1 text-xs text-bad">The email failed to send.</p>
                )}
              </li>
            ))}
          </ol>
          <div className="mt-6 border-t border-line pt-4">
            <Pagination page={page} lastPage={lastPage} hrefForPage={hrefForPage} />
          </div>
        </>
      )}
    </Panel>
  );
}
