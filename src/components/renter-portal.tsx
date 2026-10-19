import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Container } from "@/components/ui";
import { PortalSwitcher } from "@/components/portal-switcher";
import { getOwnProfile, type Profile } from "@/lib/profile";
import { profilePath } from "@/lib/routes";

const SECTIONS = [
  { href: "/browse", label: "Browse" },
  { href: "/rentals", label: "My Rentals" },
  { href: "/messages", label: "Messages" },
  { href: profilePath("wallet"), label: "Wallet" },
  { href: profilePath("account"), label: "Profile" },
] as const;

export type RenterSection = (typeof SECTIONS)[number]["label"];

/**
 * S3-13: the renter portal is for members who have switched renting on.
 * Anyone else is sent to the profile's Renting tab, which offers to switch it
 * on. Call it before fetching anything, so no booking data is loaded for
 * someone who can't see it. A signed-out visitor never gets this far: the
 * proxy sends them to log in (Scenario 5).
 */
export async function requireRenter(): Promise<Profile> {
  const profile = await getOwnProfile();
  if (!profile?.wants_to_rent) redirect(profilePath("renter"));
  return profile;
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
      <nav className="mt-8 flex gap-6 overflow-x-auto border-b border-line" aria-label="Renter dashboard">
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
