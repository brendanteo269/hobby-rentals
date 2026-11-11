"use client";

import dynamic from "next/dynamic";
import { Truck } from "lucide-react";
import { Button, Skeleton } from "@/components/ui";
import { PostalAddressFields } from "@/components/postal-address-fields";
import type { PostalAddress } from "@/components/use-postal-address";
import { OUTSIDE_RADIUS_MESSAGE, type DeliveryChoice, type DeliveryOffer } from "@/lib/delivery";
import { formatMoney } from "@/lib/format";

// Leaflet needs the browser, so the map is never rendered on the server.
const DeliveryRadiusMap = dynamic(
  () => import("@/components/bookings/delivery-radius-map").then((module) => module.DeliveryRadiusMap),
  { ssr: false, loading: () => <Skeleton className="h-56 w-full rounded-xl" /> },
);

/**
 * S6-09 Scenarios 2 and 3: the renter choosing delivery on the booking summary.
 *
 * Offered only when the listing delivers. The renter gives a postal code and
 * address, sees where that falls against the radius, and asks the server to
 * price it - the server decides whether it is inside, so what this shows is
 * never a promise: "Delivery not available to your area" is the server's answer
 * to the address, passed in as `unavailable`.
 *
 * The postal-address state lives in the booking form, not here: re-pricing the
 * dates or a promo code re-renders the summary this sits in, and a renter should
 * not have to type their address again because they added a code.
 */
export function DeliveryField({
  offer,
  wanted,
  onWantedChange,
  lookup,
  applied,
  unavailable,
  onApply,
  disabled = false,
}: {
  offer: DeliveryOffer;
  wanted: boolean;
  onWantedChange: (wanted: boolean) => void;
  lookup: PostalAddress;
  /** The address the server accepted and priced, if any. */
  applied: DeliveryChoice | null;
  /** The server said the address is outside the radius. */
  unavailable: boolean;
  onApply: (choice: DeliveryChoice) => void;
  disabled?: boolean;
}) {
  if (!offer.offered) return null;

  const fee = formatMoney(offer.offered_fee_cents ?? 0);
  const { address, point } = lookup;
  const canApply = Boolean(point) && address.trim().length > 0;

  return (
    <div className="mt-4 rounded-xl border border-line p-4">
      <label className="flex cursor-pointer gap-3">
        <input
          type="checkbox"
          checked={wanted}
          disabled={disabled}
          onChange={(event) => onWantedChange(event.target.checked)}
          className="mt-1 size-4 shrink-0 accent-ink"
        />
        <span>
          <span className="flex items-center gap-1.5 font-medium text-ink">
            <Truck className="size-4" aria-hidden="true" />
            Deliver to me · {fee}
          </span>
          <span className="body-copy mt-1 block text-sm">
            The owner brings it to you within about {offer.radius_km} km of their collection area. The fee is a
            separate charge: promo codes do not reduce it. You pay it when the booking is requested and the owner
            receives it once you confirm you have the item; if the booking is cancelled before then, you get it back
            in full.
          </span>
        </span>
      </label>

      {wanted && offer.centre && offer.radius_km !== undefined && (
        <div className="mt-4 space-y-3">
          <PostalAddressFields lookup={lookup} addressPlaceholder="Where should it be delivered?" />
          <DeliveryRadiusMap centre={offer.centre} radiusKm={offer.radius_km} point={point} />

          {unavailable && (
            <p role="alert" className="text-sm font-medium text-accent-dark">
              {OUTSIDE_RADIUS_MESSAGE}.
            </p>
          )}
          {applied && !unavailable && (
            <p role="status" className="text-sm text-ink-soft">
              Delivering to {applied.address}
              {offer.distance_km !== undefined && ` · about ${offer.distance_km} km from the collection area`}.
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={disabled || !canApply}
            onClick={() => point && onApply({ address: address.trim(), lat: point.lat, lng: point.lng })}
          >
            {applied ? "Update delivery address" : "Use this address"}
          </Button>
        </div>
      )}
    </div>
  );
}
