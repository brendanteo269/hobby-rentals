import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Button, Container, EmptyState } from "@/components/ui";
import { PortalSwitcher } from "@/components/portal-switcher";
import { enableRenting } from "@/app/profile/actions";
import { getOwnProfile, type Profile } from "@/lib/profile";
import { RENTALS_PATH, RENTER_BOOKINGS_PATH, renterSpendingPath } from "@/lib/routes";

// Only what is about renting: Browse is in the site nav, and the wallet and
// account settings are on the profile.
const SECTIONS = [
  { href: RENTALS_PATH, label: "Overview" },
  { href: RENTER_BOOKINGS_PATH, label: "Bookings" },
  { href: renterSpendingPath(), label: "Spending" },
] as const;

export type RenterSection = (typeof SECTIONS)[number]["label"];

/**
 * S3-13: the renter portal is for members who have switched renting on.
 * Anyone else is sent to My rentals, which offers to switch it on (and so
 * must not call this itself). Call it before fetching anything, so no booking
 * data is loaded for someone who can't see it. A signed-out visitor never gets
 * this far: the proxy sends them to log in (Scenario 5).
 */
export async function requireRenter(): Promise<Profile> {
  const profile = await getOwnProfile();
  if (!profile?.wants_to_rent) redirect(RENTALS_PATH);
  return profile;
}

/**
 * Shown in place of the renter portal to a member who has not switched renting
 * on, so an early "list only" choice never becomes a dead end. A single click:
 * where a booking is collected is agreed per booking, so there is nothing to
 * ask, unlike owning (see EnableOwningPrompt).
 */
export function EnableRentingPrompt() {
  return (
    <Container className="py-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Renter dashboard</p>
          <h1 className="heading mt-3 text-3xl">My rentals</h1>
        </div>
        <PortalSwitcher active="renter" />
      </div>
      <div className="mt-8">
        <EmptyState
          title="Renting is not switched on"
          body="Turn it on to book listings from people nearby. Nothing is charged until an owner accepts."
          action={
            <form action={enableRenting}>
              <Button type="submit">Start renting</Button>
            </form>
          }
        />
      </div>
    </Container>
  );
}

/** S3-13 Scenario 1: the renter portal's navigation, with the role switcher for members who also own. */
export function RenterPortal({ active, title, children }: { active: RenterSection; title: string; children: ReactNode }) {
  return (
    <Container className="py-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Renter dashboard</p>
          <h1 className="heading mt-3 text-3xl">{title}</h1>
        </div>
        <PortalSwitcher active="renter" />
      </div>
      <nav className="mt-8 flex gap-6 overflow-x-auto overflow-y-hidden border-b border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Renter dashboard">
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
