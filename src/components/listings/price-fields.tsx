"use client";

import { useState } from "react";
import { Field } from "@/components/ui";
import { PricePerBlockField } from "@/components/listings/price-per-block-field";
import { centsToDollars, dollarsToCents, formatMoney } from "@/lib/format";

/** Anything priced the way a listing is: per day or per week, with a deposit. */
export type Priced = {
  price_per_day_cents: number | null;
  price_per_week_cents: number | null;
  deposit_cents: number;
};

function priceFrom(priced: Priced): { block: "DAY" | "WEEK"; rate: string } {
  return priced.price_per_day_cents !== null
    ? { block: "DAY", rate: centsToDollars(priced.price_per_day_cents) }
    : { block: "WEEK", rate: centsToDollars(priced.price_per_week_cents ?? 0) };
}

/**
 * The deposit field's hint text: the static explanation always, plus a live
 * "recommended up to $X" once a rate is entered.
 *
 * Mirrors listing_service.deposit_cap_cents's formula exactly (a week rate
 * used directly, or a day rate x7) so the number shown here is never a value
 * the backend would then reject - a proactive echo of that rule, not a second
 * one that could drift from it.
 */
function depositCapHint(depositCapBps: number, block: "DAY" | "WEEK" | null, rate: string): string {
  const base = "Held, not charged. Enter 0 for none.";
  const rateCents = dollarsToCents(rate);
  if (block === null || rateCents === null || Number.isNaN(rateCents) || rateCents <= 0) {
    return base;
  }
  const weeklyEquivalentCents = block === "WEEK" ? rateCents : rateCents * 7;
  const capCents = Math.floor((weeklyEquivalentCents * depositCapBps) / 10_000);
  return `${base} Recommended: up to ${formatMoney(capCents)} (${depositCapBps / 100}% of the weekly rate).`;
}

/**
 * The rate and deposit pair, shared by the listing and bundle forms.
 *
 * Extracted when the bundle form needed the same two fields: a bundle is
 * priced exactly as a listing is, and the deposit cap is one rule, so
 * rendering them from one place is what keeps the two forms from drifting
 * apart a field or a hint at a time.
 *
 * Holds its own state rather than taking values from the parent, because
 * React resets a form's uncontrolled fields once a form action finishes -
 * which would wipe a rate the owner typed the moment a submission came back
 * with an error somewhere else on the page.
 */
export function PriceFields({
  depositCapBps,
  priceError,
  depositError,
  initial,
}: {
  /** Basis points (10000 = 100%) a deposit may not exceed of the weekly-equivalent rate. */
  depositCapBps: number;
  /** Whichever of the two rate fields the backend complained about - at most one is ever submitted. */
  priceError?: string;
  depositError?: string;
  /** The stored values when editing; omitted on create. */
  initial?: Priced | null;
}) {
  const initialPrice = initial ? priceFrom(initial) : null;
  const [block, setBlock] = useState<"DAY" | "WEEK" | null>(initialPrice?.block ?? null);
  const [rate, setRate] = useState(initialPrice?.rate ?? "");
  const [deposit, setDeposit] = useState(initial ? centsToDollars(initial.deposit_cents) : "");

  return (
    <>
      <PricePerBlockField
        error={priceError}
        initialBlock={initialPrice?.block}
        rate={rate}
        onRateChange={(nextBlock, nextRate) => {
          setBlock(nextBlock);
          setRate(nextRate);
        }}
      />

      <Field
        label="Security deposit"
        id="deposit"
        name="deposit"
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        placeholder="0.00"
        required
        hint={depositCapHint(depositCapBps, block, rate)}
        error={depositError}
        className="max-w-xs"
        value={deposit}
        onChange={(event) => setDeposit(event.target.value)}
      />
    </>
  );
}
