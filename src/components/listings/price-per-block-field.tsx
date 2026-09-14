"use client";

import { useState } from "react";
import { Field } from "@/components/ui";

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
export function PricePerBlockField({ error }: { error?: string }) {
  const [block, setBlock] = useState<Block | null>(null);
  const [rate, setRate] = useState("");

  return (
    <div>
      <span className="block text-sm font-medium">
        Price per rental block
        <span aria-hidden="true" className="text-clay">
          {" "}
          *
        </span>
      </span>

      <div className="mt-2 flex flex-wrap gap-2">
        <BlockChip label="Per day" checked={block === "DAY"} onSelect={() => setBlock("DAY")} />
        <BlockChip label="Per week" checked={block === "WEEK"} onSelect={() => setBlock("WEEK")} />
      </div>

      {/* The field's own `name` carries which block was chosen straight into
          the request shape (price_per_day_cents / price_per_week_cents),
          so the server action needs no extra field to read the choice from. */}
      {block && (
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
          onChange={(event) => setRate(event.target.value)}
          required
          hint="SGD"
          error={error}
          className="mt-4 max-w-xs"
        />
      )}

      {!block && error && (
        <p role="alert" className="mt-2 text-xs text-clay">
          {error}
        </p>
      )}
    </div>
  );
}

/** A toggleable pill, styled to match the blackout-rules weekday picker. */
function BlockChip({
  label,
  checked,
  onSelect,
}: {
  label: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <label className="cursor-pointer border border-line px-4 py-2 text-sm transition-colors hover:border-ink has-checked:border-ink has-checked:bg-sand">
      {/* A radio, not a checkbox: the two blocks are mutually exclusive. */}
      <input
        type="radio"
        name="price_block_choice"
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />
      {label}
    </label>
  );
}
