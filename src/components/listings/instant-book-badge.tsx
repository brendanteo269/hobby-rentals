import { Zap } from "lucide-react";
import { Badge } from "@/components/ui";

/**
 * S5-11 Scenario 1: the label a listing carries when its owner allows
 * instant booking.
 *
 * Shown to every renter, not only the ones who qualify. It describes the
 * listing's terms - the same way the price does - and a renter who does not
 * yet hold the badge learning that it exists is the point of showing it.
 * What it means for *this* renter is said on the listing page, where there
 * is room for it.
 */
export function InstantBookBadge({ enabled, className = "" }: { enabled?: boolean; className?: string }) {
  if (!enabled) return null;
  return (
    <Badge variant="accent" className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap ${className}`}>
      <Zap className="h-3 w-3" aria-hidden />
      Instant Book to Trusted Renters
    </Badge>
  );
}
