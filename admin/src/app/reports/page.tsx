import Link from "next/link";
import { requirePortalSession } from "@/lib/admin";
import { listOpenUserReports, USER_REPORT_STATUS, USER_REPORT_REASON_LABELS } from "@/lib/reports";
import { formatDateTime } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { Badge, Container, EmptyState, Panel } from "@/components/ui";

export const metadata = { title: "Reports — HobbyRentals Admin" };

/**
 * S3-22: members' reports on other users, made from a booking conversation
 * and carrying that conversation as evidence, awaiting a decision. The oldest
 * leads the queue. A report goes to the reported user only if upheld.
 */
export default async function ReportsPage() {
  await requirePortalSession();
  const { reports, error } = await listOpenUserReports();

  return (
    <Container className="py-12">
      <p className="eyebrow">Moderation</p>
      <h1 className="display-caps mt-3 text-3xl">User reports</h1>

      <div className="mt-8">
        <Panel
          title="Awaiting review"
          description={error ?? `${reports.length} report${reports.length === 1 ? "" : "s"}.`}
        >
          {reports.length === 0 ? (
            <div className="-mx-6 -my-5">
              <EmptyState title="No open user reports" body="Reports made from booking conversations appear here." />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {reports.map((report) => (
                <li key={report.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <Link href={ROUTES.report(report.id)} className="font-medium underline-offset-4 hover:underline">
                      {report.reporter.display_name ?? "A member"} reported {report.reported.display_name ?? "a member"}
                    </Link>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {USER_REPORT_REASON_LABELS[report.reason_code] ?? report.reason_code} ·{" "}
                      {report.booking.listing_name ?? "a booking"} · {report.message_count} message
                      {report.message_count === 1 ? "" : "s"} · {formatDateTime(report.created_at)}
                    </p>
                  </div>
                  <Badge tone={USER_REPORT_STATUS[report.status].tone}>{USER_REPORT_STATUS[report.status].label}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </Container>
  );
}
