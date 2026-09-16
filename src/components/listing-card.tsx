import { ImageSlot } from "@/components/ui";
import type { Listing } from "@/lib/marketplace-data";
import { Star } from "lucide-react";

/** A single piece of gear in the landing page's "Popular listings" grid. */
export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <li className="overflow-hidden card">
      <ImageSlot label={listing.slot} src={listing.photoUrl} className="aspect-square w-full" />
      <div className="p-4">
        <p className="eyebrow">{listing.category}</p>
        <h3 className="heading mt-1.5 text-sm leading-snug">{listing.title}</h3>
        <p className="mt-2 text-sm font-semibold">{listing.price}</p>
        <p className="mt-1.5 flex items-center gap-1 text-xs text-ink-soft">
          <Star className="size-3.5 fill-ink text-ink" aria-hidden="true" />
          {listing.rating} · {listing.location}
        </p>
      </div>
    </li>
  );
}
