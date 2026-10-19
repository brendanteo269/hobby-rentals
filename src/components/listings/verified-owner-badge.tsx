import { BadgeCheck, Star } from "lucide-react";
import { Badge } from "@/components/ui";

/**
 * S4-01: the Verified Owner badge.
 *
 * About the *person* listing the item - not to be confused with the "Serial
 * verified" badge on the same cards, which is about the item's passport. The
 * wording says "Owner" explicitly for that reason, and it is never shortened.
 *
 * Renders nothing when the owner does not currently qualify. The badge is
 * derived from their record on every read, so it appears and disappears on
 * its own as they cross the criteria (Scenario 2) - there is no state here to
 * go stale.
 */
export function VerifiedOwnerBadge({ verified, className = "" }: { verified?: boolean; className?: string }) {
  if (!verified) return null;
  return (
    <Badge variant="dark" className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap ${className}`}>
      <BadgeCheck className="h-3 w-3" aria-hidden />
      Verified Owner Badge
      {/* Filled, so it reads as a star at 12px rather than a smudge. */}
      <Star className="h-3 w-3 fill-current" aria-hidden />
    </Badge>
  );
}
