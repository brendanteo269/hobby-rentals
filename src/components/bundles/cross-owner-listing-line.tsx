import type { ReactNode } from "react";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { ImageSlot } from "@/components/ui";
import { collectionLabel, type CrossOwnerBundleListing } from "@/lib/cross-owner-bundles";
import { formatMoney } from "@/lib/format";

/**
 * One listing offered for a cross-owner bundle (S5-08): what it is, whose it
 * is, where it is collected from, and what it costs for the bundle's dates.
 * The pick, each swap and each search result all show it the same way;
 * `children` is whatever the caller wants to do with it, under the price.
 */
export function CrossOwnerListingLine({ listing, children }: { listing: CrossOwnerBundleListing; children?: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <ImageSlot
        label={listing.name}
        src={listing.primary_photo_url ?? undefined}
        className="size-16 shrink-0 rounded-lg"
      />
      <div className="min-w-0 flex-1">
        <Link href={`/listings/${listing.id}`} className="font-medium hover:underline">
          {listing.name}
        </Link>
        <p className="body-copy mt-0.5 flex items-center gap-1 text-xs">
          {listing.owner_name ?? "Owner"}
          {listing.owner_verified && <BadgeCheck className="size-3.5 text-success" aria-label="Verified owner" />}
        </p>
        <p className="body-copy text-xs">{collectionLabel(listing.location_area, listing.distance_km)}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold">{formatMoney(listing.rental_subtotal_cents)}</p>
        <p className="text-xs text-ink-soft">
          for {listing.rental_days} {listing.rental_days === 1 ? "day" : "days"}
        </p>
        {children}
      </div>
    </div>
  );
}
