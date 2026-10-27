import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui";

/**
 * S4-06: the Trusted Renter badge.
 *
 * About the person renting - not the Verified Owner badge, which is about the
 * person listing, and not "Email verified", which is about an address. All
 * three can appear on one member, so this one names "Renter" explicitly and
 * is never shortened.
 *
 * Renders nothing when the renter does not currently qualify. The badge is
 * derived from their record on every read, so it appears and disappears on
 * its own as they cross the criteria (Scenario 2) - there is no state here to
 * go stale.
 */
export function TrustedRenterBadge({ trusted, className = "" }: { trusted?: boolean; className?: string }) {
  if (!trusted) return null;
  return (
    <Badge variant="dark" className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap ${className}`}>
      <ShieldCheck className="h-3 w-3" aria-hidden />
      Trusted Renter
    </Badge>
  );
}
