import Link from "next/link";
import { formatMoney } from "@/lib/format";
import {
  CATEGORY_LABELS,
  LOCATION_LABELS,
  type ListingCard as ListingCardData,
} from "@/lib/listings";
import { ListingCardCarousel } from "./listing-card-carousel";

/**
 * One real listing in the browse grid.
 *
 * Separate from components/listing-card.tsx, which renders the landing page's
 * placeholder copy: that card's fields (a formatted price string, a marketing
 * line) are written by hand, while these come from the API as cents and enum
 * tokens. Merging them would mean one component pretending to two contracts.
 * Unlike that placeholder card, this one carries no rating or "Product
 * Passport" ribbon — real listings have no such field yet.
 *
 * Two separate <Link>s to the same listing (one on the photo via
 * ListingCardCarousel, one on the info below) rather than one link wrapping
 * everything - the carousel's prev/next/dot buttons can't be nested inside
 * an <a>, so the photo needs its own link rather than sharing the outer one.
 */
export function ListingCard({ listing }: { listing: ListingCardData }) {
  return (
    <li className="group overflow-hidden card transition-colors hover:border-ink-soft">
      <ListingCardCarousel
        photoUrls={listing.photo_urls}
        listingId={listing.id}
        name={listing.name}
        locationLabel={LOCATION_LABELS[listing.location_area]}
      />

      <Link href={`/listings/${listing.id}`} className="block p-4">
        <p className="eyebrow">{CATEGORY_LABELS[listing.category]}</p>
        <h3 className="heading mt-1.5 text-sm leading-snug">{listing.name}</h3>

        <div className="mt-3 flex items-baseline gap-2 border-t border-line pt-3">
          <RateLine listing={listing} />
        </div>
        <p className="body-copy mt-1">{formatMoney(listing.deposit_cents)} deposit</p>
      </Link>
    </li>
  );
}

/**
 * The amount(s) a listing charges by. A listing always carries at least one
 * of the two rates, never neither, but which one — or both — varies per
 * listing, so this renders whichever are set. The figure leads in a heavier
 * weight and the unit trails in a lighter one, the usual price-tag hierarchy.
 */
export function RateLine({
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
