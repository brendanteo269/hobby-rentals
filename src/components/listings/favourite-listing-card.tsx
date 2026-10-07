"use client";

import { useRouter } from "next/navigation";
import { ImageSlot } from "@/components/ui";
import { ListingCard } from "@/components/browse/listing-card";
import { LISTING_STATUS_LABELS, type FavouriteListing } from "@/lib/listings";
import { FavouriteButton } from "./favourite-button";

/** A saved item that is no longer active remains readable and removable, but
 * is deliberately not a link: opening it would correctly return a 404. */
export function FavouriteListingCard({ listing }: { listing: FavouriteListing }) {
  const router = useRouter();
  const active = listing.status === "ACTIVE";
  if (active) return <ListingCard listing={listing} onFavouriteRemoved={() => router.refresh()} />;
  const content = (
    <>
      <ImageSlot label={listing.name} src={listing.primary_photo_url ?? undefined} className={`aspect-square w-full ${active ? "" : "grayscale opacity-60"}`} />
      <div className="p-4">
        <p className="heading text-sm leading-snug">{listing.name}</p>
        <p className="mt-3 text-sm text-ink-soft">Listing currently unavailable ({LISTING_STATUS_LABELS[listing.status].toLowerCase()}).</p>
      </div>
    </>
  );

  return (
    <li className={`overflow-hidden card ${active ? "transition-colors hover:border-ink-soft" : "border-dashed bg-surface-muted"}`}>
      <div>{content}</div>
      <div className="flex items-center justify-end border-t border-line px-3 py-1">
        <FavouriteButton
          listingId={listing.id}
          initiallySaved
          initialCount={0}
          hideCount
          onRemoved={() => router.refresh()}
        />
      </div>
    </li>
  );
}
