"use client";

import { useState } from "react";
import { Field } from "@/components/ui";
import { centsToDollars, formatMoney } from "@/lib/format";

/**
 * S2-09: what the owner says it would cost to replace this item.
 *
 * Not a price the renter ever pays. It decides two things: whether damage
 * protection can be offered on this listing at all, and - where it can - the
 * most the scheme will pay towards damage.
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
  eligibilityCapCents,
  coverageCapCents,
}: {
  error?: string;
  /** The stored value when editing; omitted on create. */
  initialCents?: number | null;
  /** Above this, the item is outside the scheme entirely. */
  eligibilityCapCents: number;
  /** The scheme's own ceiling, which a cheaper item lowers. */
  coverageCapCents: number;
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
        `Optional. What it would cost you to replace this item. Renters can add damage protection ` +
        `on items worth up to ${formatMoney(eligibilityCapCents)}, covering up to ` +
        `${formatMoney(coverageCapCents)} or the replacement value, whichever is lower. ` +
        `Leave blank and protection is not offered.`
      }
      error={error}
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  );
}
