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
    <li className="flex flex-col">
      {/* Photo hosting is not wired up yet, so the key stands in for the image. */}
      <ImageSlot
        label={listing.primary_photo_key ?? "No photo yet"}
        className="aspect-square w-full"
      />

      <p className="eyebrow mt-4">{CATEGORY_LABELS[listing.category]}</p>
      <h3 className="mt-2 text-sm font-semibold uppercase leading-snug tracking-wide">
        {listing.name}
      </h3>

      <p className="mt-2 text-sm font-medium">{formatMoney(listing.price_per_day_cents)} / day</p>
      <p className="body-copy mt-1">
        {formatMoney(listing.deposit_cents)} deposit · {LOCATION_LABELS[listing.location_area]}
      </p>
    </li>
  );
}
