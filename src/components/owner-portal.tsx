import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Container } from "@/components/ui";
import { getOwnProfile } from "@/lib/profile";
import { profilePath } from "@/lib/routes";

const SECTIONS = [
  { href: "/listings/mine", label: "Inventory" },
  { href: "/listings/mine/bookings", label: "Bookings" },
  { href: "/listings/mine/earnings", label: "Earnings" },
  { href: "/listings/mine/settings", label: "Settings" },
] as const;

export type OwnerSection = (typeof SECTIONS)[number]["label"];

/**
 * S2-01 Scenario 5: the owner portal is for members who have switched owning
 * on. Anyone else is sent to the profile's Owning tab, which offers to switch
 * it on. Call it before fetching anything, so no listing data is loaded for
 * someone who can't see it.
 */
export async function requireOwner() {
  const profile = await getOwnProfile();
  if (!profile?.wants_to_own) redirect(profilePath("owner"));
  return profile;
}

/** S2-01 Scenario 1: the owner portal's navigation, shared by its four sections. */
export function OwnerPortal({ active, title, children }: { active: OwnerSection; title: string; children: ReactNode }) {
  return (
    <Container className="py-16">
      <p className="eyebrow">Owner dashboard</p>
      <h1 className="heading mt-3 text-3xl">{title}</h1>
      <nav className="mt-8 flex gap-6 overflow-x-auto border-b border-line" aria-label="Owner dashboard">
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
