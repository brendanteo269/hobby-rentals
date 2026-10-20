import { Megaphone } from "lucide-react";
import { Badge } from "@/components/ui";

/**
 * S3-28 "Promoted" pill. Solid accent with an icon, so on a browse card it
 * can't be mistaken for the soft "High demand" tag beside it.
 */
export function PromotedBadge({ promoted, className = "" }: { promoted?: boolean; className?: string }) {
  if (!promoted) return null;
  return (
    <Badge variant="accent-strong" className={`shrink-0 gap-1 whitespace-nowrap ${className}`}>
      <Megaphone className="h-3 w-3" aria-hidden />
      Promoted
    </Badge>
  );
}
