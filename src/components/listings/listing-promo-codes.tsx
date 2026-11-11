import type { Route } from "next";
import { Tag } from "lucide-react";
import { Badge, ButtonLink } from "@/components/ui";
import {
  PROMO_CODE_STATE_LABELS,
  promoCodeState,
  promoDiscountLabel,
  promoUsesLeft,
  type PromoCode,
  type PromoCodeState,
} from "@/lib/promo-codes";
import { formatDate, todayIso } from "@/lib/format";

/**
 * S5-12: the owner's view of their own listing's discount codes.
 *
 * Read-only on purpose - this page is where an owner checks what is running,
 * and managing codes belongs with the rest of the listing's settings rather
 * than being a second place that can change them.
 *
 * Codes that are over or not yet open are shown too, not filtered out: when
 * a renter says a code did not work, "Expired" on this page is the answer,
 * and a list of only the live ones would leave the owner with nothing to
 * look at.
 */
const STATE_TONES: Record<PromoCodeState, "success" | "neutral" | "warning"> = {
  RUNNING: "success",
  SCHEDULED: "warning",
  EXPIRED: "neutral",
  USED_UP: "neutral",
};

export function ListingPromoCodes({ listingId, codes }: { listingId: string; codes: PromoCode[] }) {
  const today = todayIso();

  return (
    <section className="mt-6 border-t border-line pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="heading text-lg">Promo codes</h2>
        <ButtonLink
          href={`/listings/${listingId}/edit#promo-codes` as Route}
          variant="outline"
          className="px-4 py-2 text-xs"
        >
          {codes.length > 0 ? "Manage codes" : "Add a code"}
        </ButtonLink>
      </div>

      {codes.length === 0 ? (
        <p className="body-copy mt-1">
          No discount codes on this listing. A code takes an amount off the rental; the deposit is
          never discounted.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {codes.map((code) => {
            const state = promoCodeState(code, today);
            const left = promoUsesLeft(code);
            return (
              <li
                key={code.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3 text-sm"
              >
                <span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <Tag className="size-3.5" aria-hidden="true" />
                    {code.code.toUpperCase()}
                  </span>
                  <span className="text-ink-soft"> · {promoDiscountLabel(code)}</span>
                  <span className="mt-0.5 block text-xs text-ink-soft">
                    {formatDate(code.starts_on)} – {formatDate(code.ends_on)} · {code.times_used}{" "}
                    used
                    {left === null ? " · no limit" : ` · ${left} left`}
                  </span>
                </span>
                <Badge variant={STATE_TONES[state]}>{PROMO_CODE_STATE_LABELS[state]}</Badge>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
