import { Truck } from "lucide-react";
import { meetupMapsSearchUrl } from "@/lib/meetups";
import { formatMoney } from "@/lib/format";

/**
 * S6-09 Scenario 4: where a delivered booking is handed over, in the place a
 * meetup location would be.
 *
 * The pickup photos and the handover confirmation happen there, the same as at
 * a meetup, so the address sits with them. Renders nothing for a booking that
 * is not delivered. The map link is the meetup card's: a search on the address
 * text, with no geocoding of our own.
 */
export function DeliveryAddressLine({
  booking,
  className = "",
}: {
  booking: { delivery_selected?: boolean; delivery_address?: string | null; delivery_fee_cents?: number };
  className?: string;
}) {
  if (!booking.delivery_selected || !booking.delivery_address) return null;
  return (
    <span className={`flex items-start gap-1.5 text-ink-soft ${className}`}>
      <Truck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>
        Delivery to {booking.delivery_address}
        {booking.delivery_fee_cents ? ` · ${formatMoney(booking.delivery_fee_cents)} delivery fee` : ""}
        {" · "}
        <a
          href={meetupMapsSearchUrl(booking.delivery_address)}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          Map
        </a>
      </span>
    </span>
  );
}
