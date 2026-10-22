import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui";
import { DashboardShell } from "@/components/dashboard-shell";
import { EnableOwningForm } from "@/components/enable-owning-form";
import { getOwnProfile } from "@/lib/profile";
import { MY_LISTINGS_PATH, ownerInsightsPath } from "@/lib/routes";
import { Store } from "lucide-react";

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
    <DashboardShell side="owner" title="My listings">
      <EmptyState icon={Store}
        title="Owning is not switched on"
        body="Turn it on to create listings for the gear you already have and earn from it between uses."
        action={<EnableOwningForm />}
      />
    </DashboardShell>
  );
}

/** S2-01 Scenario 1: the owner portal's navigation, shared by its sections. */
export function OwnerPortal({ active, title, children }: { active: OwnerSection; title: string; children: ReactNode }) {
  return (
    <DashboardShell side="owner" title={title} tabs={SECTIONS} active={active}>
      {children}
    </DashboardShell>
  );
}
