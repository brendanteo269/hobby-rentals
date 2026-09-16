"use client";

import { useState } from "react";
import { Chip, Field } from "@/components/ui";

type Block = "DAY" | "WEEK";

/**
 * Price per rental block: the owner picks the block they price by — per day
 * or per week, not both — and one shared rate box appears once they have.
 *
 * The two are mutually exclusive rather than additive: this is one field
 * ("price per rental block") with a choice of unit, not two independent
 * prices, so there is one box, one value, and switching the chip just
 * relabels what the same box means rather than swapping to a second input.
 * The backend requires at least one to be chosen; nothing is submitted under
 * either name until the owner picks one.
 */
export function PricePerBlockField({
  error,
  onRateChange,
  initialBlock = null,
  initialRate = "",
}: {
  error?: string;
  /** Fires on every block/rate change, including back to (null, "") when the owner hasn't picked a block yet - so a parent showing a rate-derived hint (the deposit cap) always reflects the current choice. */
  onRateChange?: (block: Block | null, rateDollars: string) => void;
  /** The stored choice when editing; omitted on create, where the owner has not picked yet. */
  initialBlock?: Block | null;
  /** Dollars, as the input shows them - see centsToDollars. */
  initialRate?: string;
}) {
  const [block, setBlock] = useState<Block | null>(initialBlock);
  const [rate, setRate] = useState(initialRate);

  function chooseBlock(next: Block) {
    setBlock(next);
    onRateChange?.(next, rate);
  }

  function changeRate(next: string) {
    setRate(next);
    onRateChange?.(block, next);
  }

  return (
    <div>
      <span className="block text-sm font-medium">
        Price per rental block
        <span aria-hidden="true" className="text-accent">
          {" "}
          *
        </span>
      </span>

      <div className="mt-2 flex flex-wrap gap-2">
        <Chip selected={block === "DAY"} onClick={() => chooseBlock("DAY")}>
          Per day
        </Chip>
        <Chip selected={block === "WEEK"} onClick={() => chooseBlock("WEEK")}>
          Per week
        </Chip>
      </div>

      {/* The field's own `name` carries which block was chosen straight into
          the request shape (price_per_day_cents / price_per_week_cents),
          so the server action needs no extra field to read the choice from. */}
      {block && (
        <div className="mt-4">
          <Field
            label={block === "DAY" ? "Daily rate" : "Weekly rate"}
            id="price_rate"
            name={block === "DAY" ? "price_per_day" : "price_per_week"}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder={block === "DAY" ? "25.00" : "120.00"}
            value={rate}
            onChange={(event) => changeRate(event.target.value)}
            required
            hint="SGD"
            error={error}
            className="max-w-xs"
          />
        </div>
      )}

      {!block && error && (
        <p role="alert" className="mt-2 text-xs text-accent-dark">
          {error}
        </p>
      )}
    </div>
  );
}
