"use client";

import { useState } from "react";
import { Field } from "@/components/ui";
import { centsToDollars } from "@/lib/format";

/**
 * S2-06: what the owner says it would cost to replace this item.
 *
 * It is optional for a listing, but required before the owner can buy
 * HobbyShield. It also remains an input to renter damage-protection eligibility.
 *
 * Deliberately not part of PriceFields, which the bundle form also uses: a
 * bundle is a group of listings and has no replacement value of its own.
 *
 * Holds its own state for the same reason PriceFields does - React resets a
 * form's uncontrolled fields once a form action finishes, which would wipe
 * this the moment a submission came back with an error elsewhere.
 */
export function ReplacementValueField({
  error,
  initialCents,
}: {
  error?: string;
  /** The stored value when editing; omitted on create. */
  initialCents?: number | null;
}) {
  const [value, setValue] = useState(initialCents != null ? centsToDollars(initialCents) : "");

  return (
    <Field
      label="Replacement value"
      id="replacement_value"
      name="replacement_value"
      type="number"
      min="0"
      step="0.01"
      inputMode="decimal"
      placeholder="0.00"
      className="max-w-xs"
      hint={
        "Required to buy HobbyShield Protection Plan. Enter what it would cost you to replace this item: " +
        "HobbyShield uses it to calculate your 30-day premium (3.5%, minimum S$10), coverage cap and 10% owner excess. " +
        "It also supports renter damage-protection eligibility. "
      }
      error={error}
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  );
}
