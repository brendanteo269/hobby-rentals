import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePortalSession } from "@/lib/admin";
import { ROUTES } from "@/lib/routes";
import { getUserAuditTrail, recordUserReportViewed } from "@/lib/audit";
import { getReportAssessment, getUserSuspendBanHistory, getUserModeration } from "@/lib/moderation";
import { getReportsAboutUser } from "@/lib/reports";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  accountStatus,
  getUserById,
  isEmailVerified,
  isBanned,
  isSuspended,
  roleLabels,
  userLabel,
} from "@/lib/users";
import { Badge, Container, DescriptionList, Panel } from "@/components/ui";
import { VerificationPanel } from "@/components/verification-panel";
import { UserSuspendBanPanel } from "@/components/user-suspend-ban-panel";
import { UserModerationPanel } from "@/components/user-moderation-panel";
import { UserReportsPanel } from "@/components/user-reports-panel";
import { isUserView, UserViewTabs } from "@/components/user-view-tabs";
import { AuditTrail } from "@/components/audit-trail";
import { AUDIT_PAGE_SIZE } from "@/lib/audit";

export const metadata = { title: "Account — HobbyRentals Admin" };

/** Sorts a report that earned no strike after every one that did. */
const NO_STRIKE = 1_000_000;

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string; report?: string; auditPage?: string }>;
}) {
  await requirePortalSession();
  const { id } = await params;
  const { view: viewParam, report: reportParam, auditPage: auditPageParam } = await searchParams;
  const view = isUserView(viewParam) ? viewParam : "account";
  const auditPage = Math.max(1, Number(auditPageParam) || 1);

  const user = await getUserById(id);
  // Covers both a malformed id and one that does not exist. The two are not
  // distinguished, so this page cannot be used to probe which ids are real.
  if (!user) notFound();

  const status = accountStatus(user);
  const verified = isEmailVerified(user);
  const suspended = isSuspended(user);
  const banned = isBanned(user);
  // The tabs are separate screens: what an account is, and what has been
  // reported about it. Only the one in view is fetched in full, but the open
  // count is needed for the tab either way.
  const [moderation, reports, enforcements] = await Promise.all([
    getUserModeration(user.id),
    getReportsAboutUser(user.id),
    getUserSuspendBanHistory(user.id),
  ]);
  const openReports = reports.filter((report) => report.status === "OPEN");
  // One report is shown at a time, in the strikes' order: report 1 is the one
  // behind strike 1 and so on, then the reports that earned none (open ones
  // first, then the rest, newest first - the API's order).
  const strikeNumbers: Record<string, number> = Object.fromEntries(
    (moderation?.strikes ?? []).map((strike, index) => [strike.report_id, index + 1] as const),
  );
  const orderedReports = [...reports].sort((a, b) => (strikeNumbers[a.id] ?? NO_STRIKE) - (strikeNumbers[b.id] ?? NO_STRIKE));
  // An unknown or missing id falls back to the first.
  const selectedIndex = Math.max(0, orderedReports.findIndex((report) => report.id === reportParam));
  const selected = orderedReports[selectedIndex];
  const assessment = view === "reports" && selected ? await getReportAssessment(selected.id) : null;
  // A report holds a whole conversation, so opening it is itself recorded.
  if (view === "reports" && selected?.status === "OPEN") await recordUserReportViewed(selected.id, user.id);
  const { entries: auditEntries, total: auditTotal } =
    view === "account" ? await getUserAuditTrail(user.id, auditPage) : { entries: [], total: 0 };
  const auditLastPage = Math.max(1, Math.ceil(auditTotal / AUDIT_PAGE_SIZE));

  return (
    <Container className="py-12">
      <Link
        href={ROUTES.users}
        className="text-sm text-ink-soft transition-colors hover:text-ink"
      >
        ← All accounts
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Account</p>
          <h1 className="display-caps mt-3 text-3xl">{userLabel(user)}</h1>
          <p className="body-copy mt-2">{user.email ?? "No email address"}</p>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      <p className="body-copy mt-4 max-w-prose">{status.detail}</p>
      <div className="mt-8">
        <UserViewTabs userId={user.id} active={view} openReports={openReports.length} />
      </div>

      {view === "account" ? (
        <>
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Panel title="Account details">
              <DescriptionList
                items={[
                  { term: "Account ID", value: <code className="text-xs">{user.id}</code> },
                  { term: "Email address", value: user.email ?? "—" },
                  {
                    term: "Email verification",
                    value: (
                      <span className="flex flex-wrap items-center gap-2">
                        <Badge tone={verified ? "positive" : "warning"}>
                          {verified ? "Verified" : "Unverified"}
                        </Badge>
                        {verified && (
                          <span className="text-ink-soft">
                            on {formatDate(user.email_confirmed_at)}
                          </span>
                        )}
                      </span>
                    ),
                  },
                  {
                    term: "Roles",
                    value: (
                      <span className="flex flex-wrap gap-1.5">
                        {roleLabels(user).map((role) => (
                          <Badge key={role.label} tone={role.tone}>
                            {role.label}
                          </Badge>
                        ))}
                      </span>
                    ),
                  },
                  { term: "Registered", value: formatDateTime(user.created_at) },
                  { term: "Last sign in", value: formatDateTime(user.last_sign_in_at, "Never") },
                  {
                    term: "Setup completed",
                    value: formatDateTime(user.onboarded_at, "Not finished"),
                  },
                  {
                    term: banned ? "Banned" : "Suspended until",
                    // banned_until can be a past date once a suspension lapses —
                    // showing it as-is would contradict the "Active" badge above.
                    value: banned ? "Permanently" : formatDateTime(suspended ? user.banned_until : null, "Not suspended"),
                  },
                ]}
              />
            </Panel>

            <VerificationPanel userId={user.id} email={user.email} verified={verified} />

          <UserSuspendBanPanel
            userId={user.id}
            history={enforcements}
            isAdmin={user.roles.includes("admin")}
          />

          </div>

          <AuditTrail
            entries={auditEntries}
            page={auditPage}
            lastPage={auditLastPage}
            hrefForPage={(p) => (p > 1 ? `${ROUTES.user(user.id)}?auditPage=${p}` : ROUTES.user(user.id))}
          />
        </div>
        </>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <UserReportsPanel
              userId={user.id}
              reports={orderedReports}
              selectedIndex={selectedIndex}
              strikeNumbers={strikeNumbers}
              assessment={assessment}
            />
          </div>
          <div>{moderation && <UserModerationPanel moderation={moderation} />}</div>
        </div>
      )}
    </Container>
  );
}
