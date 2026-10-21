import Link from "next/link";
import { ROUTES } from "@/lib/routes";

export type UserView = "account" | "reports";

/** Whether a URL's view parameter is one of the tabs, so a made-up one falls back to the account. */
export function isUserView(value: string | undefined): value is UserView {
  return value === "account" || value === "reports";
}

/** Where a member's page opens on a tab; the account is the default, so it has no parameter. */
export function userViewPath(userId: string, view: UserView) {
  return view === "account" ? ROUTES.user(userId) : (`${ROUTES.user(userId)}?view=${view}` as ReturnType<typeof ROUTES.user>);
}

/** Where the Reports tab opens on one report, as the pager and the queue link to it. */
export function userReportPath(userId: string, reportId: string) {
  return `${ROUTES.user(userId)}?view=reports&report=${reportId}` as ReturnType<typeof ROUTES.user>;
}

/**
 * The tabs on a member's page, laid out as the member's own profile tabs are:
 * the account (details, verification, activity) apart from the reports made
 * about them (what was reported, the evidence, the decision, strikes), so a
 * long report does not push the account down the page. The open count on the
 * Reports tab is what draws an administrator's eye to it.
 */
export function UserViewTabs({ userId, active, openReports }: { userId: string; active: UserView; openReports: number }) {
  const tabs: { view: UserView; label: string }[] = [
    { view: "account", label: "Account" },
    { view: "reports", label: "Reports" },
  ];
  return (
    <nav className="flex gap-6 border-b border-line" aria-label="Member view">
      {tabs.map((tab) => {
        const isActive = tab.view === active;
        return (
          <Link
            key={tab.view}
            href={userViewPath(userId, tab.view)}
            aria-current={isActive ? "page" : undefined}
            className={`-mb-px flex items-center gap-2 border-b-2 px-1 pb-3 text-sm transition-colors ${
              isActive ? "border-ink font-medium text-ink" : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {tab.label}
            {tab.view === "reports" && openReports > 0 && (
              <span className="rounded-full bg-clay px-2 py-0.5 text-[0.6875rem] font-semibold leading-none text-white">
                {openReports}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
