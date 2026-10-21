import { Badge, Panel } from "./ui";
import { formatDateTime } from "@/lib/format";
import { SUSPENSION_DAYS, type UserModeration } from "@/lib/moderation";

/**
 * A member's moderation record (S3-23): the strikes warnings have added, and
 * any suspension they led to. Administrators only - the member is never shown a
 * strike count - and read-only: strikes are added by deciding a report, and a
 * suspension lifts by itself when its period ends.
 */
export function UserModerationPanel({ moderation }: { moderation: UserModeration }) {
  const { strikes, strike_limit: limit, suspension } = moderation;
  return (
    <Panel
      title="Moderation"
      description={`${strikes.length} of ${limit} strikes. Not shown to the member. Strike ${limit} suspends the account for ${SUSPENSION_DAYS} days, which then lifts by itself.`}
    >
      {suspension && (
        <p className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <Badge tone="critical">Suspended</Badge>
          until {formatDateTime(suspension.ends_at)}
        </p>
      )}
      {strikes.length === 0 ? (
        <p className="text-sm text-ink-soft">No strikes.</p>
      ) : (
        <ol className="space-y-3">
          {strikes.map((strike, index) => (
            <li key={strike.id} className="border-l-2 border-line pl-4 text-sm">
              <p className="font-medium">Strike {index + 1}</p>
              <p className="text-xs text-ink-soft">
                {formatDateTime(strike.created_at)} ·{" "}
                <a href={`?view=reports&report=${strike.report_id}`} className="underline underline-offset-4">
                  View report
                </a>
              </p>
              <p className="mt-1 whitespace-pre-line">{strike.reason}</p>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
