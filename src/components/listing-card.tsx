import { ButtonLink, ImageSlot } from "@/components/ui";
import type { Listing } from "@/lib/marketplace-data";

/** A single piece of gear in a results grid. */
export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <li className="flex flex-col">
      <ImageSlot label={listing.slot} className="aspect-square w-full" />
      <h3 className="mt-4 text-sm font-semibold uppercase leading-snug tracking-wide">
        {listing.title}
      </h3>
      <p className="mt-2 text-sm font-medium">{listing.price}</p>
      <p className="body-copy mt-2">{listing.body}</p>
      <p className="mt-2 text-xs text-ink-soft">{listing.meta}</p>
      <p className="mt-4">
        <span className="inline-block rounded-full bg-blush px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide">
          {listing.tag}
        </span>
      </p>
      <ButtonLink href="/signup" className="mt-4 w-full">
        Rent now
      </ButtonLink>
    </li>
  );
}
