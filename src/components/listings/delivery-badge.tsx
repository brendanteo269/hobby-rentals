import { Truck } from "lucide-react";
import { Badge } from "@/components/ui";
import { deliveryBadge, type DeliverySettings } from "@/lib/delivery";

/**
 * S6-09 Scenario 1: the label a listing carries when its owner delivers.
 *
 * Shown to every renter, like the Instant Book label: it describes the
 * listing's terms. Whether delivery reaches this renter's address is not known
 * here, so the card promises nothing beyond what the owner offered; the
 * booking form is where it is checked ("Delivery not available to your area").
 */
export function DeliveryBadge({ listing, className = "" }: { listing: Partial<DeliverySettings>; className?: string }) {
  const label = deliveryBadge(listing);
  if (!label) return null;
  return (
    <Badge variant="accent" className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap ${className}`}>
      <Truck className="h-3 w-3" aria-hidden />
      {label}
    </Badge>
  );
}
