"use client";

import { Tag } from "lucide-react";
import { Button, Input } from "@/components/ui";

/**
 * S5-12 Scenario 2: the renter applying an owner's discount code.
 *
 * The renter sends a code and never an amount - the server resolves and
 * prices it - so a refusal (Scenario 3) comes back as the reason it was
 * refused, and the price on screen is never something the browser decided.
 *
 * Shown only once dates are chosen: a code is worth a percentage of a
 * rental, and until there are dates there is no rental to take it off.
 */
export function PromoCodeField({
  value,
  onChange,
  appliedCode,
  error,
  disabled,
  onApply,
  onRemove,
}: {
  value: string;
  onChange: (value: string) => void;
  appliedCode: string | null;
  error: string | null;
  disabled: boolean;
  onApply: () => void;
  onRemove: () => void;
}) {
  if (appliedCode) {
    return (
      <div className="mt-5 flex flex-wrap items-center gap-3 bg-success-soft px-4 py-3 text-sm text-success">
        <Tag className="size-4 shrink-0" aria-hidden="true" />
        <span className="font-medium">{appliedCode.toUpperCase()} applied</span>
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          className="ml-auto underline underline-offset-4 disabled:opacity-60"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <label htmlFor="promo-code" className="text-sm font-medium text-ink">
        Promo code
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        <Input
          id="promo-code"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          // Enter applies it rather than submitting the booking: a renter
          // pressing return on a code must not place a wallet hold.
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (value.trim()) onApply();
            }
          }}
          placeholder="SUMMER10"
          maxLength={32}
          className="w-44 uppercase"
          aria-describedby={error ? "promo-code-error" : undefined}
          aria-invalid={error ? true : undefined}
        />
        <Button variant="outline" disabled={disabled || !value.trim()} onClick={onApply}>
          Apply
        </Button>
      </div>
      {error && (
        <p id="promo-code-error" role="alert" className="mt-2 text-sm text-accent-dark">
          {error}
        </p>
      )}
    </div>
  );
}
