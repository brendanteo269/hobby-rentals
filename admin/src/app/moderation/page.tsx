import type { Route } from "next";
import Link from "next/link";
import { requirePortalSession } from "@/lib/admin";
import {
  AI_SUGGESTION_LABELS,
  DECISION_LABELS,
  getAiAgreement,
  formatCaseAge,
  getModerationQueue,
  KIND_LABELS,
  PAGE_SIZE,
  PRIORITY,
  type QueuedReport,
  type QueueStatus,
  type ReportKind,
} from "@/lib/moderation";
import { LISTING_REPORT_REASON_LABELS, USER_REPORT_REASON_LABELS } from "@/lib/reports";
import { formatDateTime } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { Badge, Container, EmptyState, Panel } from "@/components/ui";
import { Pagination } from "@/components/pagination";

export const metadata = { title: "Moderation — HobbyRentals Admin" };

const STATUS_FILTERS: { key: QueueStatus | "ALL"; label: string }[] = [
  { key: "OPEN", label: "Open" },
  { key: "DECIDED", label: "Decided" },
  { key: "ALL", label: "All" },
];

const KIND_FILTERS: { key: ReportKind | "ALL"; label: string }[] = [
  { key: "ALL", label: "Listings and users" },
  { key: "LISTING", label: "Listings" },
  { key: "USER", label: "Users" },
];

function reasonLabel(report: QueuedReport): string {
  const labels = report.kind === "LISTING" ? LISTING_REPORT_REASON_LABELS : USER_REPORT_REASON_LABELS;
  return labels[report.reason_code] ?? report.reason_code;
}

function hrefFor(status: string, kind: string, page = 1): Route {
  const params = new URLSearchParams();
  if (status !== "OPEN") params.set("status", status);
  if (kind !== "ALL") params.set("kind", kind);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return (query ? `${ROUTES.moderation}?${query}` : ROUTES.moderation) as Route;
}

/**
 * S3-23: every report on a listing or a user, in one queue. Open reports lead,
 * most urgent then oldest; each row is a case, opened for its evidence and its
 * decision.
 */
export default async function ModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; kind?: string; page?: string }>;
}) {
  await requirePortalSession();
  const { status: statusParam, kind: kindParam, page: pageParam } = await searchParams;
  const status = statusParam === "DECIDED" || statusParam === "ALL" ? statusParam : "OPEN";
  const kind = kindParam === "LISTING" || kindParam === "USER" ? kindParam : "ALL";
  const page = Math.max(1, Number(pageParam) || 1);

  const [{ reports, total, error }, agreement] = await Promise.all([
    getModerationQueue(status === "ALL" ? null : status, kind === "ALL" ? null : kind, page),
    getAiAgreement(),
  ]);
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Container className="py-12">
      <p className="eyebrow">Moderation</p>
      <h1 className="display-caps mt-3 text-3xl">Moderation queue</h1>

      <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
        <nav className="flex gap-4" aria-label="Status">
          {STATUS_FILTERS.map((filter) => (
            <Link
              key={filter.key}
              href={hrefFor(filter.key, kind)}
              aria-current={status === filter.key ? "page" : undefined}
              className={status === filter.key ? "font-medium underline underline-offset-4" : "text-ink-soft hover:text-ink"}
            >
              {filter.label}
            </Link>
          ))}
        </nav>
        <nav className="flex gap-4" aria-label="Report type">
          {KIND_FILTERS.map((filter) => (
            <Link
              key={filter.key}
              href={hrefFor(status, filter.key)}
              aria-current={kind === filter.key ? "page" : undefined}
              className={kind === filter.key ? "font-medium underline underline-offset-4" : "text-ink-soft hover:text-ink"}
            >
              {filter.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        <Panel title="Reports" description={error ?? `${total} report${total === 1 ? "" : "s"}.`}>
          {reports.length === 0 ? (
            <div className="-mx-6 -my-5">
              <EmptyState title="No reports" body="Nothing matches this view." />
            </div>
          ) : (
            <div className="-mx-6 -my-5 overflow-x-auto">
              <table className="w-full min-w-5xl border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-left">
                    {["Type", "Reason", "Priority", "Status", "AI", "Reporter", "Reported", "Submitted", "Case age"].map((heading) => (
                      <th key={heading} scope="col" className="eyebrow px-6 py-3 font-normal">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id} className="border-b border-line last:border-0 hover:bg-sand">
                      <td className="px-6 py-4">
                        <Link href={ROUTES.moderationReport(report.id)} className="font-medium underline-offset-4 hover:underline">
                          {KIND_LABELS[report.kind]}
                        </Link>
                      </td>
                      <td className="px-6 py-4">{reasonLabel(report)}</td>
                      <td className="px-6 py-4">
                        <Badge tone={PRIORITY[report.priority].tone}>{PRIORITY[report.priority].label}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {report.status === "OPEN" ? (
                          <Badge tone="warning">Open</Badge>
                        ) : (
                          <Badge tone="neutral">
                            {report.decision ? DECISION_LABELS[report.decision] : "Decided"}
                            {report.decision_by === "AI" && " by AI"}
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-ink-soft">
                        {report.ai_status === "DONE" && report.ai_suggestion
                          ? `${AI_SUGGESTION_LABELS[report.ai_suggestion]} · ${Math.round((report.ai_confidence ?? 0) * 100)}%`
                          : report.ai_status === "PROCESSING"
                            ? "Assessing…"
                            : "—"}
                      </td>
                      <td className="px-6 py-4">{report.reporter_name ?? "A member"}</td>
                      <td className="px-6 py-4">
                        {report.kind === "LISTING" ? (report.listing_name ?? "A listing") : (report.reported_name ?? "A member")}
                        {report.kind === "LISTING" && report.reported_name && (
                          <span className="block text-xs text-ink-soft">Owner: {report.reported_name}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-ink-soft">{formatDateTime(report.created_at)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-ink-soft">{formatCaseAge(report.case_age_seconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      {agreement.length > 0 && (
        <div className="mt-8">
          <Panel
            title="AI triage and the administrators"
            description="On decided reports the AI assessed: what it suggested against what was decided. Read this before turning automatic dismissal on."
          >
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  {["AI suggested", "Decided", "By", "Reports", "Of those, confident"].map((heading) => (
                    <th key={heading} scope="col" className="eyebrow py-2 pr-6 font-normal">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agreement.map((row) => (
                  <tr key={`${row.suggestion}-${row.decision}-${row.decided_by}`} className="border-b border-line last:border-0">
                    <td className="py-2 pr-6">{AI_SUGGESTION_LABELS[row.suggestion]}</td>
                    <td className="py-2 pr-6">{DECISION_LABELS[row.decision]}</td>
                    <td className="py-2 pr-6 text-ink-soft">{row.decided_by === "AI" ? "AI" : "Administrator"}</td>
                    <td className="py-2 pr-6">{row.reports}</td>
                    <td className="py-2 pr-6">{row.confident_reports}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>
      )}

      <Pagination page={page} lastPage={lastPage} hrefForPage={(p) => hrefFor(status, kind, p)} />
    </Container>
  );
}
