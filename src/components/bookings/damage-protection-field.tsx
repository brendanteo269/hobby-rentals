"use client";

import { ShieldCheck, ShieldOff } from "lucide-react";
import { formatMoney } from "@/lib/format";
import type { DamageProtectionOffer } from "@/lib/bookings";

/**
 * S2-09: the damage protection choice, on the booking summary.
 *
 * All three terms - fee, cover and excess - are on screen before the renter
 * chooses, because consent to terms disclosed afterwards is not consent
 * (Note 1). When the listing is not eligible the option is replaced by the
 * reason, rather than shown disabled with no explanation (Scenario 5).
 *
 * The wording avoids "insurance" throughout, deliberately: this is a scheme
 * the platform administers out of the fees it collects, with no insurer
 * behind it and none of the protection that word would imply (Note 2).
 */
export function DamageProtectionField({
  offer,
  onChange,
  disabled = false,
}: {
  offer: DamageProtectionOffer;
  onChange: (selected: boolean) => void;
  disabled?: boolean;
}) {
  // What unprotected damage can actually come to. The deposit is only the
  // money already held as security - saying a renter is "liable up to the
  // deposit" would understate what they are agreeing to.
  const liability =
    offer.replacement_value_cents !== null
      ? `up to ${formatMoney(offer.replacement_value_cents)} to replace this item`
      : "for the cost of any damage";
  const depositNote =
    offer.deposit_at_risk_cents > 0
      ? ` Your ${formatMoney(offer.deposit_at_risk_cents)} security deposit is held against that.`
      : "";

  if (!offer.available) {
    return (
      <div className="mt-4 flex gap-3 rounded-lg border border-line p-3">
        <ShieldOff className="mt-0.5 size-4 shrink-0 text-ink-soft" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium">Damage protection unavailable</p>
          <p className="body-copy mt-1">
            {offer.unavailable_reason} If the item is damaged you are responsible {liability}.
            {depositNote}
          </p>
        </div>
      </div>
    );
  }

  // Cover can stop short of what the item is worth, and a renter agreeing to
  // protection should know where it stops rather than assume it is total.
  const uncovered =
    offer.replacement_value_cents !== null && offer.coverage_cap_cents !== null
      ? Math.max(offer.replacement_value_cents - offer.coverage_cap_cents, 0)
      : 0;

  return (
    <div
      className={`mt-4 rounded-lg border p-3 transition-colors ${
        offer.selected ? "border-ink bg-surface-muted" : "border-line"
      }`}
    >
      <label className="flex cursor-pointer gap-3">
        <input
          type="checkbox"
          className="mt-1 size-4 shrink-0 accent-ink"
          checked={offer.selected}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <ShieldCheck className="size-4 text-accent" aria-hidden="true" />
            Add damage protection — {formatMoney(offer.offered_fee_cents ?? offer.fee_cents)}
          </span>
          <span className="body-copy mt-1 block">
            Covers accidental damage up to {formatMoney(offer.coverage_cap_cents ?? 0)}, with{" "}
            {formatMoney(offer.excess_cents ?? 0)} payable by you on any claim.
          </span>
        </span>
      </label>

      {/* Scenario 3: the renter should see what declining costs them, not
          only what accepting costs. */}
      <p className="body-copy mt-2 border-t border-line pt-2">
        {offer.selected ? (
          <>
            Your claim cost is limited to the {formatMoney(offer.excess_cents ?? 0)} excess
            {uncovered > 0 ? (
              <>
                , plus any damage exceeding the {formatMoney(offer.coverage_cap_cents ?? 0)} coverage
                cap. This item would cost {formatMoney(offer.replacement_value_cents ?? 0)} to
                replace.
              </>
            ) : (
              "."
            )}
          </>
        ) : (
          <>
            Without it, you are responsible {liability} if it is damaged.{depositNote}
          </>
        )}
      </p>

      <p className="mt-2 text-xs text-ink-soft">
        A HobbyRentals scheme funded by protection fees, not an insurance policy.
      </p>
    </div>
  );
}
