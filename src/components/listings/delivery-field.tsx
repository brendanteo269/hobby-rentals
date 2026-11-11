"use client";

import { useState } from "react";
import { Truck } from "lucide-react";
import { Field } from "@/components/ui";
import { MAX_DELIVERY_FEE_CENTS, MAX_DELIVERY_RADIUS_KM, type DeliverySettings } from "@/lib/delivery";
import { centsToDollars } from "@/lib/format";

/**
 * S6-09 Scenario 1: the owner offering delivery within a radius for a flat fee.
 *
 * The radius is measured from the centre of the listing's collection area, not
 * from the owner's door, and the field says so: an owner who set 3 km
 * expecting it from their own address would otherwise be surprised by who can
 * choose delivery.
 *
 * Holds its own state, as ReplacementValueField does: React resets a form's
 * uncontrolled fields once its action returns, which would otherwise wipe the
 * radius and fee the moment a submission came back with an error elsewhere.
 * The inputs only mount while delivery is on, so nothing is submitted for them
 * otherwise and the listing's radius and fee are cleared.
 */
export function DeliveryField({
  initial,
  radiusError,
  feeError,
}: {
  /** The stored settings when editing; omitted on create. */
  initial?: Partial<DeliverySettings>;
  radiusError?: string;
  feeError?: string;
}) {
  const [enabled, setEnabled] = useState(initial?.delivery_enabled ?? false);
  const [radius, setRadius] = useState(initial?.delivery_radius_km != null ? String(initial.delivery_radius_km) : "");
  const [fee, setFee] = useState(initial?.delivery_fee_cents != null ? centsToDollars(initial.delivery_fee_cents) : "");

  return (
    <div className="rounded-xl border border-line p-4">
      <label className="flex cursor-pointer gap-3">
        <input
          type="checkbox"
          name="delivery_enabled"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
          className="mt-1 size-4 shrink-0 accent-ink"
        />
        <span>
          <span className="flex items-center gap-1.5 font-medium text-ink">
            <Truck className="size-4" aria-hidden="true" />
            Offer delivery
          </span>
          <span className="body-copy mt-1 block text-sm">
            Renters within your radius can choose to have this delivered for a flat fee. You are paid the fee once
            the renter confirms they have the item, and nothing is taken from it. If a booking is cancelled before
            then, the renter gets the fee back in full.
          </span>
        </span>
      </label>

      {enabled && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            label="Radius (km)"
            id="delivery_radius_km"
            name="delivery_radius_km"
            type="number"
            min="0.5"
            max={MAX_DELIVERY_RADIUS_KM}
            step="0.5"
            inputMode="decimal"
            placeholder="5"
            hint="Measured from the centre of your collection area, so it is approximate."
            error={radiusError}
            value={radius}
            onChange={(event) => setRadius(event.target.value)}
          />
          <Field
            label="Delivery fee (S$)"
            id="delivery_fee"
            name="delivery_fee"
            type="number"
            min="0"
            max={MAX_DELIVERY_FEE_CENTS / 100}
            step="0.01"
            inputMode="decimal"
            placeholder="8.00"
            hint="A flat fee. Promo codes do not reduce it."
            error={feeError}
            value={fee}
            onChange={(event) => setFee(event.target.value)}
          />
        </div>
      )}
    </div>
  );
}
