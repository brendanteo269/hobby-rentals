import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePortalSession } from "@/lib/admin";
import { recordUserReportViewed } from "@/lib/audit";
import { DECISION_LABELS, getReportAssessment, getReportKind, KIND_LABELS } from "@/lib/moderation";
import { getListingReports, getUserReport, USER_REPORT_STATUS } from "@/lib/reports";
import { ROUTES } from "@/lib/routes";
import { formatDateTime, shortId } from "@/lib/format";
import { Badge, Container, Panel } from "@/components/ui";
import { ListingReportsPanel } from "@/components/listing-reports-panel";
import { ReopenAiDismissalForm } from "@/components/reopen-ai-dismissal-form";
import { ReportAssessmentPanel } from "@/components/report-assessment-panel";
import { UserReportDecisionForm } from "@/components/user-report-decision-form";
import { UserReportEvidence } from "@/components/user-report-evidence";

export const metadata = { title: "Report — HobbyRentals Admin" };

/**
 * S3-23: one report from the queue, listing or user. It shows the reported
 * party, the reason, the explanation, the booking and the evidence as it was
 * captured, and - while open - the decisions: dismiss or deactivate for a
 * listing, dismiss or warn for a user. A decided report shows what was decided
 * and why. Looking at a user report is itself recorded, since its evidence is
 * a whole conversation.
 */
export default async function ModerationReportPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePortalSession();
  const { id } = await params;

  const found = await getReportKind(id);
  // Covers a malformed id and an unknown one alike.
  if (!found) notFound();

  return (
    <Container className="py-12">
      <Link href={ROUTES.moderation} className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink">
        ← Moderation queue
      </Link>
      {found.kind === "LISTING" ? <ListingReportCase id={id} listingId={found.listing_id} /> : <UserReportCase id={id} />}
    </Container>
  );
}

async function ListingReportCase({ id, listingId }: { id: string; listingId: string | null }) {
  const report = listingId ? (await getListingReports(listingId)).find((candidate) => candidate.id === id) : undefined;
  if (!listingId || !report) notFound();

  return (
    <>
      <div className="mt-6">
        <p className="eyebrow">{KIND_LABELS.LISTING} report</p>
        <h1 className="display-caps mt-3 text-3xl">{report.evidence.listing?.name ?? "A listing"}</h1>
        <p className="body-copy mt-2">
          {shortId(report.id)} ·{" "}
          <Link href={ROUTES.listing(listingId)} className="underline underline-offset-4">
            Open the listing
          </Link>
        </p>
      </div>
      <div className="mt-10 space-y-6">
        <ReportAssessmentPanel assessment={await getReportAssessment(id)} />
        {report.decision_by === "AI" && report.status === "DISMISSED" && <ReopenAiDismissalForm reportId={id} />}
        <ListingReportsPanel listingId={listingId} reports={[report]} />
      </div>
    </>
  );
}

async function UserReportCase({ id }: { id: string }) {
  const report = await getUserReport(id);
  if (!report) notFound();

  await recordUserReportViewed(id, report.reported.id);

  const status = USER_REPORT_STATUS[report.status];
  const assessment = await getReportAssessment(id);
  return (
    <>
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{KIND_LABELS.USER} report</p>
          <h1 className="display-caps mt-3 text-3xl">
            {report.reporter.display_name ?? "A member"} reported {report.reported.display_name ?? "a member"}
          </h1>
          <p className="body-copy mt-2">{shortId(report.id)}</p>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      <div className="mt-10 space-y-6">
        <ReportAssessmentPanel assessment={assessment} />
        {report.status === "DISMISSED" && report.decision_by === "AI" && <ReopenAiDismissalForm reportId={report.id} />}
        {report.status === "OPEN" ? (
          <UserReportDecisionForm reportId={report.id} />
        ) : (
          <Panel
            title="Decision"
            description={`${report.status === "ACTIONED" ? DECISION_LABELS.WARN : DECISION_LABELS.DISMISS}, ${formatDateTime(report.resolved_at)}.`}
          >
            <p className="eyebrow">Reason</p>
            <p className="mt-1.5 whitespace-pre-line text-sm">{report.resolution_note}</p>
          </Panel>
        )}
        <UserReportEvidence report={report} relied={assessment?.cited_messages ?? []} />
      </div>
    </>
  );
}
