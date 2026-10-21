import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePortalSession } from "@/lib/admin";
import { recordUserReportViewed } from "@/lib/audit";
import { getUserReport, USER_REPORT_STATUS } from "@/lib/reports";
import { ROUTES } from "@/lib/routes";
import { formatDateTime, shortId } from "@/lib/format";
import { Badge, Container, Panel } from "@/components/ui";
import { UserReportDecisionForm } from "@/components/user-report-decision-form";
import { UserReportEvidence } from "@/components/user-report-evidence";

export const metadata = { title: "Report — HobbyRentals Admin" };

/**
 * S3-22: one user report with its evidence bundle, and the decision on it. The
 * bundle holds a whole conversation, so looking is itself recorded against the
 * person reported. An open report is decided here; a decided one shows what was
 * decided and why.
 */
export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePortalSession();
  const { id } = await params;

  const report = await getUserReport(id);
  // Covers a malformed id and an unknown one alike.
  if (!report) notFound();

  await recordUserReportViewed(id, report.reported.id);

  return (
    <Container className="py-12">
      <Link href={ROUTES.reports} className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink">
        ← Reports
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">User report</p>
          <h1 className="display-caps mt-3 text-3xl">
            {report.reporter.display_name ?? "A member"} reported {report.reported.display_name ?? "a member"}
          </h1>
          <p className="body-copy mt-2">{shortId(report.id)}</p>
        </div>
        <Badge tone={USER_REPORT_STATUS[report.status].tone}>{USER_REPORT_STATUS[report.status].label}</Badge>
      </div>

      <div className="mt-10 space-y-6">
        {report.status === "OPEN" ? (
          <UserReportDecisionForm reportId={report.id} />
        ) : (
          <Panel
            title="Decision"
            description={`${report.status === "ACTIONED" ? "Upheld and sent to the reported user" : "Dismissed; the reported user was not told"}, ${formatDateTime(report.resolved_at)}.`}
          >
            <p className="eyebrow">Reason</p>
            <p className="mt-1.5 whitespace-pre-line text-sm">{report.resolution_note}</p>
          </Panel>
        )}
        <UserReportEvidence report={report} />
      </div>
    </Container>
  );
}
