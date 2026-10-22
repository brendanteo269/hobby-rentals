import Link from "next/link";
import { MY_LISTINGS_PATH, RENTALS_PATH } from "@/lib/routes";

const PORTALS = [
  { side: "renter", href: RENTALS_PATH, label: "Renting" },
  { side: "owner", href: MY_LISTINGS_PATH, label: "Owning" },
] as const;

/**
 * S3-13 Scenario 4: moves a member between the two halves of My dashboard.
 * Plain links: the session cookie goes with them, so nobody signs in again.
 *
 * Shown to every member, not only those who do both: the header has one
 * "My dashboard" link, so this is the only way to the other side, and each
 * portal's home offers to switch that side on for a member who has not.
 */
export function PortalSwitcher({ active }: { active: "renter" | "owner" }) {
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
