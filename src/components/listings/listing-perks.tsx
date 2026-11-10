import type { LucideIcon } from "lucide-react";
import { BookOpen, Truck, Zap } from "lucide-react";
import { deliveryBadge, type DeliverySettings } from "@/lib/delivery";
import { formatMoney } from "@/lib/format";

/**
 * What comes with renting this listing, under its price on the detail pages:
 * terms of the rental rather than labels about the listing, so they sit with
 * the price and deposit and have room to say what they mean - a hover title
 * does not reach a phone. Search cards keep the short badges.
 */
export function ListingPerks({
  instantBook,
  guide,
  delivery,
}: {
  instantBook?: boolean;
  guide?: boolean;
  delivery?: Partial<DeliverySettings>;
}) {
  const perks: { icon: LucideIcon; title: string; detail: string }[] = [];
  // S6-09 Scenario 1. The fee and radius are terms the renter weighs before booking, so they are stated here.
  const deliveryTitle = delivery ? deliveryBadge(delivery) : null;
  if (deliveryTitle && delivery) {
    perks.push({
      icon: Truck,
      title: deliveryTitle,
      detail: `${formatMoney(delivery.delivery_fee_cents ?? 0)} flat fee within about ${delivery.delivery_radius_km} km of the collection area.`,
    });
  }
  if (instantBook) {
    perks.push({ icon: Zap, title: "Instant Book", detail: "Trusted Renters are confirmed on the spot." });
  }
  // S6-02 Scenario 2: that a guide exists - never its content.
  if (guide) {
    perks.push({ icon: BookOpen, title: "Quick-start guide included", detail: "The owner's setup steps and safety tips unlock once your booking is confirmed." });
  }
  if (perks.length === 0) return null;
  return (
    <ul className="mt-3 space-y-2">
      {perks.map((perk) => (
        <li key={perk.title} className="flex items-start gap-2 text-sm">
          <perk.icon className="mt-0.5 h-4 w-4 shrink-0 text-accent-dark" aria-hidden />
          <span>
            <span className="font-medium">{perk.title}</span>
            <span className="text-ink-soft"> · {perk.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
