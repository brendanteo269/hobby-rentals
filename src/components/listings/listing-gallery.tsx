"use client";

import { useState } from "react";
import { ImageSlot } from "@/components/ui";

/**
 * A listing's full photo set on its detail page: a large hero photo with a
 * thumbnail strip beneath it to switch which one is shown.
 *
 * No photo-less fallback branch - a real listing always has at least one
 * uploaded photo (enforced by CreateListingRequest's photo_keys validator on
 * the API), so photoUrls is never empty here.
 */
export function ListingGallery({ photoUrls, name }: { photoUrls: string[]; name: string }) {
  const [active, setActive] = useState(0);

  return (
    <div>
      <ImageSlot label={name} src={photoUrls[active]} className="aspect-square w-full rounded-lg" />

      {photoUrls.length > 1 && (
        <ul className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
          {photoUrls.map((url, index) => (
            <li key={url}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Photo ${index + 1} of ${photoUrls.length}`}
                aria-current={index === active}
                // w-full is load-bearing, not decorative: a <button> shrinks
                // to fit its content even with display:block, so without it
                // the aspect-square ImageSlot inside has nothing to compute
                // a width from and collapses to 0x0.
                className={`block w-full overflow-hidden rounded-md ring-2 transition-colors ${
                  index === active ? "ring-ink" : "ring-transparent hover:ring-line"
                }`}
              >
                <ImageSlot label="" src={url} className="aspect-square w-full" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
