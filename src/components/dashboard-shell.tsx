import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { Container, Skeleton } from "@/components/ui";
import { PortalSwitcher } from "@/components/portal-switcher";

export type DashboardTab = { href: Route; label: string };

/**
 * The frame both halves of My dashboard share: a white band across the top
 * holding the page title, the Renting/Owning switcher and the section tabs,
 * with the page's content below on the warm canvas. Shared so the two portals
 * cannot drift apart, and so a member switching sides lands on a page that
 * looks like the one they left.
 *
 * `tabs` is omitted for the "switch this side on" prompt, which has no
 * sections to move between yet.
 */
export function DashboardShell({
  side,
  title,
  tabs,
  active,
  children,
}: {
  side: "renter" | "owner";
  title: string;
  tabs?: readonly DashboardTab[];
  /** The label of the current tab. */
  active?: string;
  children: ReactNode;
}) {
  return (
    <>
      <div className="border-b border-line bg-white">
        <Container className={`pt-10 ${tabs ? "" : "pb-8"}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="heading text-3xl">{title}</h1>
            <PortalSwitcher active={side} />
          </div>
          {tabs && (
            <nav
              className="-mb-px mt-6 flex gap-6 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              aria-label={side === "renter" ? "Renter dashboard" : "Owner dashboard"}
            >
              {tabs.map((tab) => {
                const isActive = tab.label === active;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`shrink-0 border-b-2 px-1 pb-3 text-sm transition-colors ${
                      isActive ? "border-accent font-medium text-ink" : "border-transparent text-ink-soft hover:text-ink"
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </Container>
      </div>
      <Container className="py-10">{children}</Container>
    </>
  );
}

/**
 * What a dashboard page shows while it loads: the same white band and canvas
 * as DashboardShell, with grey blocks where the title, tabs, stat tiles and
 * cards will be, so the page does not jump when the real one arrives.
 */
export function DashboardSkeleton() {
  return (
    <div>
      <span className="sr-only" role="status">Loading</span>
      <div className="border-b border-line bg-white">
        <Container className="pt-10">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-9 w-40 rounded-full" />
          </div>
          <div className="mt-6 flex gap-6 pb-3">
            {[0, 1, 2, 3].map((tab) => (
              <Skeleton key={tab} className="h-4 w-16" />
            ))}
          </div>
        </Container>
      </div>
      <Container className="space-y-6 py-10">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((tile) => (
            <div key={tile} className="card p-5">
              <Skeleton className="size-9 rounded-full" />
              <Skeleton className="mt-4 h-8 w-20" />
            </div>
          ))}
        </div>
        {[0, 1, 2].map((row) => (
          <div key={row} className="card space-y-3 p-5">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </Container>
    </div>
  );
}
