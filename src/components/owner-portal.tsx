import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Container, EmptyState } from "@/components/ui";
import { PortalSwitcher } from "@/components/portal-switcher";
import { EnableOwningForm } from "@/components/enable-owning-form";
import { getOwnProfile } from "@/lib/profile";
import { MY_LISTINGS_PATH, ownerInsightsPath } from "@/lib/routes";

const SECTIONS = [
  { href: MY_LISTINGS_PATH, label: "Inventory" },
  { href: ownerInsightsPath(), label: "Insights" },
  { href: "/listings/mine/bookings", label: "Bookings" },
  { href: "/listings/mine/earnings", label: "Earnings" },
  { href: "/listings/mine/settings", label: "Settings" },
] as const;

export type OwnerSection = (typeof SECTIONS)[number]["label"];

/**
 * S2-01 Scenario 5: the owner portal is for members who have switched owning
 * on. Anyone else is sent to My listings, which offers to switch it on (and so
 * must not call this itself). Call it before fetching anything, so no listing
 * data is loaded for someone who can't see it.
 */
export async function requireOwner() {
  const profile = await getOwnProfile();
  if (!profile?.wants_to_own) redirect(MY_LISTINGS_PATH);
  return profile;
}

/**
 * Shown in place of the owner portal to a member who has not switched owning
 * on. Owning carries the pickup-location question onboarding would have asked,
 * which is why it is a form rather than the bare button renting gets.
 */
export function EnableOwningPrompt() {
  return (
    <Container className="py-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Owner dashboard</p>
          <h1 className="heading mt-3 text-3xl">My listings</h1>
        </div>
        <PortalSwitcher active="owner" />
      </div>
      <div className="mt-8">
        <EmptyState
          title="Owning is not switched on"
          body="Turn it on to create listings for the gear you already have and earn from it between uses."
          action={<EnableOwningForm />}
        />
      </div>
    </Container>
  );
}

/** S2-01 Scenario 1: the owner portal's navigation, shared by its sections. */
export function OwnerPortal({ active, title, children }: { active: OwnerSection; title: string; children: ReactNode }) {
  return (
    <Container className="py-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Owner dashboard</p>
          <h1 className="heading mt-3 text-3xl">{title}</h1>
        </div>
        <PortalSwitcher active="owner" />
      </div>
      <nav className="mt-8 flex gap-6 overflow-x-auto overflow-y-hidden border-b border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Owner dashboard">
        {SECTIONS.map((section) => {
          const isActive = section.label === active;
          return (
            <Link
              key={section.href}
              href={section.href}
              aria-current={isActive ? "page" : undefined}
              className={`-mb-px shrink-0 border-b-2 px-1 pb-3 text-sm transition-colors ${
                isActive ? "border-ink font-medium text-ink" : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {section.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-8">{children}</div>
    </Container>
  );
}
