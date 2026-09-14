import { ImageSlot } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import {
  CATEGORY_LABELS,
  LOCATION_LABELS,
  type ListingCard as ListingCardData,
} from "@/lib/listings";

/**
 * One real listing in the browse grid.
 *
 * Separate from components/listing-card.tsx, which renders the landing page's
 * placeholder copy: that card's fields (a formatted price string, a marketing
 * line) are written by hand, while these come from the API as cents and enum
 * tokens. Merging them would mean one component pretending to two contracts.
 */
export function ListingCard({ listing }: { listing: ListingCardData }) {
  return (
    <li className="group border border-line bg-white transition-colors hover:border-ink-soft">
      <div className="relative overflow-hidden">
        {/* Photo hosting is not wired up yet, so the key stands in for the image. */}
        <ImageSlot
          label={listing.primary_photo_key ?? "No photo yet"}
          className="aspect-square w-full transition-transform duration-300 ease-out group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-cream/95 px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-ink">
          {LOCATION_LABELS[listing.location_area]}
        </span>
      </div>

      <div className="p-4">
        <p className="eyebrow">{CATEGORY_LABELS[listing.category]}</p>
        <h3 className="mt-1.5 text-sm font-semibold uppercase leading-snug tracking-wide">
          {listing.name}
        </h3>

        <div className="mt-3 flex items-baseline gap-2 border-t border-line pt-3">
          <RateLine listing={listing} />
        </div>
        <p className="body-copy mt-1">{formatMoney(listing.deposit_cents)} deposit</p>
      </div>
    </li>
  );
}

/**
 * The amount(s) a listing charges by. A listing always carries at least one
 * of the two rates, never neither, but which one — or both — varies per
 * listing, so this renders whichever are set. The figure leads in a heavier
 * weight and the unit trails in a lighter one, the usual price-tag hierarchy.
 */
function RateLine({
  listing,
}: {
  listing: Pick<ListingCardData, "price_per_day_cents" | "price_per_week_cents">;
}) {
  const rates: { amount: number; unit: string }[] = [];
  if (listing.price_per_day_cents !== null) {
    rates.push({ amount: listing.price_per_day_cents, unit: "day" });
  }
  if (listing.price_per_week_cents !== null) {
    rates.push({ amount: listing.price_per_week_cents, unit: "week" });
  }

  return (
    <p className="text-base font-semibold">
      {rates.map(({ amount, unit }, index) => (
        // whitespace-nowrap keeps "$320.00 / week" together as one unit, so
        // a narrow card wraps between rates rather than orphaning "week"
        // alone on its own line.
        <span key={unit} className="whitespace-nowrap">
          {index > 0 && <span className="text-ink-soft"> · </span>}
          {formatMoney(amount)}
          <span className="text-xs font-normal text-ink-soft"> / {unit}</span>
        </span>
      ))}
    </p>
  );
}
