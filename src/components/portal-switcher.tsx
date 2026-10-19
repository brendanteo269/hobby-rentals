import Link from "next/link";
import { getOwnProfile } from "@/lib/profile";

const PORTALS = [
  { side: "renter", href: "/rentals", label: "Renting" },
  { side: "owner", href: "/listings/mine", label: "Owning" },
] as const;

/**
 * S3-13 Scenario 4: moves a member who both rents and owns between the two
 * portals. Plain links: the session cookie goes with them, so nobody signs in
 * again. Renders nothing for a member with only one side switched on.
 */
export async function PortalSwitcher({ active }: { active: "renter" | "owner" }) {
  const profile = await getOwnProfile();
  if (!profile?.wants_to_rent || !profile.wants_to_own) return null;

  return (
    <nav aria-label="Switch portal" className="inline-flex rounded-full bg-surface-muted p-1">
      {PORTALS.map((portal) => {
        const isActive = portal.side === active;
        return (
          <Link
            key={portal.side}
            href={portal.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
              isActive ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink"
            }`}
          >
            {portal.label}
          </Link>
        );
      })}
    </nav>
  );
}
