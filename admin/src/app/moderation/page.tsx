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
  KIND_OPTIONS,
  PRIORITY,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  type QueueFilters,
  type QueuedReport,
} from "@/lib/moderation";
import { LISTING_REPORT_REASON_LABELS, USER_REPORT_REASON_LABELS } from "@/lib/reports";
import { formatDateTime } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { Badge, Container, EmptyState, Panel } from "@/components/ui";
import { ModerationSearch } from "@/components/moderation-search";
import { Pagination } from "@/components/pagination";

export const metadata = { title: "Moderation — HobbyRentals Admin" };

function reasonLabel(report: QueuedReport): string {
  const labels = report.kind === "LISTING" ? LISTING_REPORT_REASON_LABELS : USER_REPORT_REASON_LABELS;
  return labels[report.reason_code] ?? report.reason_code;
}

/** The values a URL parameter may hold, checked against the options so a made-up one is ignored. */
function readAll<T extends string>(raw: string | string[] | undefined, allowed: { value: T }[]): T[] {
  const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return allowed.map((option) => option.value).filter((value) => values.includes(value));
}

function hrefForPage(filters: QueueFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  filters.statuses.forEach((value) => params.append("status", value));
  filters.kinds.forEach((value) => params.append("kind", value));
  filters.priorities.forEach((value) => params.append("priority", value));
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${ROUTES.moderation}?${query}` : ROUTES.moderation;
}

/**
 * S3-23: every report on a listing or a user, in one queue. Open reports lead,
 * most urgent then oldest; each row is a case, opened for its evidence and its
 * decision.
 */
export default async function ModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string | string[]; kind?: string | string[]; priority?: string | string[]; page?: string }>;
}) {
  await requirePortalSession();
  const params = await searchParams;
  const filters: QueueFilters = {
    search: (params.q ?? "").trim(),
    statuses: readAll(params.status, STATUS_OPTIONS),
    kinds: readAll(params.kind, KIND_OPTIONS),
    priorities: readAll(params.priority, PRIORITY_OPTIONS),
  };
  const page = Math.max(1, Number(params.page) || 1);

  const [{ reports, total, error }, agreement] = await Promise.all([getModerationQueue(filters, page), getAiAgreement()]);
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(filters.search || filters.statuses.length || filters.kinds.length || filters.priorities.length);

  return (
    <Container className="py-12">
      <p className="eyebrow">Moderation</p>
      <h1 className="display-caps mt-3 text-3xl">Moderation queue</h1>

      <div className="mt-8">
        <ModerationSearch filters={filters} />
      </div>

      <div className="mt-8">
        <Panel title="Reports" description={error ?? `${total} report${total === 1 ? "" : "s"}${filtered ? " matching this search" : ""}. Open reports come first.`}>
          {reports.length === 0 ? (
            <div className="-mx-6 -my-5">
              <EmptyState title="No matching reports" body="Search by report ID, reason, reporter, reported user or listing, or loosen the filters." />
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

      <Pagination page={page} lastPage={lastPage} hrefForPage={(p) => hrefForPage(filters, p)} />
    </Container>
  );
}
