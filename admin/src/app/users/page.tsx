import type { Route } from "next";
import { redirect } from "next/navigation";
import { requirePortalSession } from "@/lib/admin";
import { searchUsers, PAGE_SIZE } from "@/lib/users";
import { ROUTES } from "@/lib/routes";
import { formatCaseAge, getAiAgreement, getModerationQueue, PRIORITY } from "@/lib/moderation";
import { USER_REPORT_REASON_LABELS } from "@/lib/reports";
import Link from "next/link";
import { Badge, Container, Panel } from "@/components/ui";
import { AiAgreementPanel } from "@/components/ai-agreement-panel";
import { UserSearch } from "@/components/user-search";
import { UserTable } from "@/components/user-table";
import { Pagination } from "@/components/pagination";

export const metadata = { title: "User management — HobbyRentals Admin" };

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  // The proxy already turned away anyone without the portal password.
  // Repeated here because a page that reads account data should not depend on
  // middleware having run — a matcher change is one edit away from silently
  // exposing it.
  await requirePortalSession();

  const { q = "", page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [{ users, total, error }, reported, agreement] = await Promise.all([
    searchUsers(q, page),
    // S3-22/S3-23: user reports waiting on an admin decision, most urgent first.
    getModerationQueue({ statuses: ["OPEN"], kinds: ["USER"], priorities: [], search: "" }, 1),
    getAiAgreement(),
  ]);

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // A page past the end of the result set (a bookmarked or shared link whose
  // matches have since shrunk) would otherwise render as a false "no
  // accounts match this search" — send it back to the real last page instead.
  if (page > lastPage) redirect(hrefForUsersPage(q, lastPage) as Route);
  const description = error
    ? error
    : total === 0
      ? "No accounts match this search."
      : `${total} account${total === 1 ? "" : "s"}${q ? " matching this search" : ""}.`;

  return (
    <Container className="py-12">
      <p className="eyebrow">Admin</p>
      <h1 className="display-caps mt-3 text-3xl">User management</h1>

      {/* S3-22/S3-23: users members reported, waiting on an admin decision. */}
      <div className="mt-8">
        <Panel
          title="Reported users"
          description={
            reported.error ??
            (reported.reports.length === 0
              ? "Nothing waiting. Users members report show up here."
              : `${reported.total} open report${reported.total === 1 ? "" : "s"}, most urgent first.`)
          }
        >
          {reported.reports.length > 0 && (
            <ul className="-mx-6 -my-5 divide-y divide-line">
              {reported.reports.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`${ROUTES.user(r.reported_user_id)}?view=reports&report=${r.id}` as Route}
                    className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 hover:bg-sand"
                  >
                    <span>
                      <span className="font-medium">{r.reported_name ?? "A member"}</span>
                      <span className="mt-0.5 block text-xs text-ink-soft">
                        Reported by {r.reporter_name ?? "a member"} · open {formatCaseAge(r.case_age_seconds)}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge tone={PRIORITY[r.priority].tone}>{PRIORITY[r.priority].label}</Badge>
                      <Badge tone="warning">{USER_REPORT_REASON_LABELS[r.reason_code] ?? r.reason_code}</Badge>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-8">
        <UserSearch query={q} />
      </div>

      <div className="mt-8">
        <Panel title="Accounts" description={description}>
          <div className="-mx-6 -my-5">
            <UserTable users={users} />
          </div>
        </Panel>
      </div>

      <Pagination page={page} lastPage={lastPage} hrefForPage={(p) => hrefForUsersPage(q, p)} />

      <div className="mt-10">
        <AiAgreementPanel rows={agreement} />
      </div>
    </Container>
  );
}

function hrefForUsersPage(q: string, page: number): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `${ROUTES.users}?${search}` : ROUTES.users;
}
