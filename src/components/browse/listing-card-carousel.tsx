"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge, ImageSlot } from "@/components/ui";

/**
 * The browse card's image area: lets a member flip through a listing's
 * photos right there on the card, without opening the listing.
 *
 * A sibling of the card's <Link> (in listing-card.tsx), not a descendant of
 * it - the prev/next/dot buttons can't nest inside an <a> (invalid, and
 * unpredictable for keyboard/screen-reader navigation), so this renders its
 * own separate <Link> over just the photo and keeps the controls next to it
 * rather than inside it.
 */
export function ListingCardCarousel({
  photoUrls,
  listingId,
  name,
  locationLabel,
}: {
  photoUrls: string[];
  listingId: string;
  name: string;
  locationLabel: string;
}) {
  const [active, setActive] = useState(0);
  const hasMultiple = photoUrls.length > 1;

  function step(delta: number) {
    setActive((current) => (current + delta + photoUrls.length) % photoUrls.length);
  }

  return (
    <div className="relative overflow-hidden">
      <Link href={`/listings/${listingId}`} className="block">
        <ImageSlot
          label={name}
          src={photoUrls[active]}
          className="aspect-square w-full transition-transform duration-300 ease-out group-hover:scale-105"
        />
      </Link>
      <Badge className="absolute left-3 top-3">{locationLabel}</Badge>

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-ink/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-ink/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>

          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
            {photoUrls.map((url, index) => (
              <button
                key={url}
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Photo ${index + 1} of ${photoUrls.length}`}
                aria-current={index === active}
                className={`size-1.5 rounded-full transition-colors ${
                  index === active ? "bg-white" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
