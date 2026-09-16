import { Badge, ImageSlot } from "@/components/ui";
import type { Listing } from "@/lib/marketplace-data";
import { Star } from "lucide-react";

/** A single piece of gear in the landing page's "Gear near you" grid. */
export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <li className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="relative">
        <ImageSlot label={listing.slot} src={listing.photoUrl} className="aspect-square w-full" />
        <Badge variant="dark" className="absolute left-3 top-3">
          Product Passport
        </Badge>
      </div>
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
