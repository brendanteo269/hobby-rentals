import { Flame } from "lucide-react";
import { Badge } from "@/components/ui";

/**
 * "High demand" pill for a listing whose category is surging. Soft accent with
 * a lucide icon, matching the other listing pills, and distinct from the solid
 * PromotedBadge it often sits beside.
 */
export function HighDemandBadge({ highDemand, className = "" }: { highDemand?: boolean; className?: string }) {
  if (!highDemand) return null;
  return (
    <Badge variant="accent" className={`shrink-0 gap-1 whitespace-nowrap ${className}`}>
      <Flame className="h-3 w-3" aria-hidden />
      High demand
    </Badge>
  );
}
