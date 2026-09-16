import Link from "next/link";
import { Badge, Container, ButtonLink, EmptyState } from "@/components/ui";
import { ListingLifecycleActions } from "@/components/listings/listing-lifecycle-actions";
import { getListingHistory, getMyListings, type ListingHistory } from "@/lib/api/listings";
import { getOwnerBookings } from "@/lib/api/bookings";
import { formatMoney } from "@/lib/format";
import { LISTING_STATUS_LABELS, LOCATION_LABELS, type Listing } from "@/lib/listings";
import { OwnerBookingList } from "@/components/bookings/owner-booking-list";
import type { Booking } from "@/lib/bookings";

export const metadata = { title: "My listings — HobbyRentals" };

/**
 * The owner's rental inventory (S1-12): every listing they've created,
 * whatever its status, with archive/restore/remove controls per row.
 * Unlike Browse, this never filters to ACTIVE - an owner managing their
 * listings needs to see drafts, archived items and pending removals too.
 */
export default async function MyListingsPage() {
  const [listings, bookings] = await Promise.all([getMyListings(), getOwnerBookings()]);
  // History is supplementary: an audit-service/network hiccup must not make
  // an owner lose access to their inventory and booking controls.
  const histories = await Promise.all(listings.map(async (listing) => {
    try {
      return [listing.id, await getListingHistory(listing.id)] as const;
    } catch {
      return [listing.id, undefined] as const;
    }
  }));
  const historyByListing = new Map(histories);

  return (
    <Container className="py-16">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="eyebrow">Owner dashboard</p>
          <h1 className="display-caps mt-3 text-3xl">My listings</h1>
        </div>
        <ButtonLink href="/listings/new" className="px-4 py-2 text-xs">
          List new gear
        </ButtonLink>
      </div>

      <div className="mt-8">
        {listings.length === 0 ? (
          <EmptyState
            title="No listings yet"
            body="Once you list a piece of gear, it'll show up here so you can manage its availability, archive it, or remove it."
            action={<ButtonLink href="/listings/new">List your gear</ButtonLink>}
          />
        ) : (
          <ul className="space-y-4">
            {listings.map((listing) => (
              <ListingRow key={listing.id} listing={listing} bookings={bookings.filter((booking) => booking.listing_id === listing.id)} history={historyByListing.get(listing.id)} />
            ))}
          </ul>
        )}
      </div>
    </Container>
  );
}

/**
 * Same status -> emphasis mapping OwnerListingCard uses (profile-views.tsx):
 * ACTIVE is the one status that should visually stand out, PENDING_REMOVAL
 * gets the accent used for anything that needs the owner's attention, and
 * every other status is a plain neutral pill.
 */
const STATUS_BADGE_VARIANT: Record<Listing["status"], "neutral" | "accent" | "dark"> = {
  DRAFT: "neutral",
  ACTIVE: "dark",
  ARCHIVED: "neutral",
  PENDING_REMOVAL: "accent",
  REMOVED: "neutral",
};

function ListingRow({ listing, bookings, history }: { listing: Listing; bookings: Booking[]; history?: ListingHistory }) {
  return (
    <li className="border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{LOCATION_LABELS[listing.location_area]}</p>
          <h2 className="mt-1 text-base font-semibold uppercase tracking-wide">
            <Link href={`/listings/${listing.id}`} className="hover:underline">
              {listing.name}
            </Link>
          </h2>
          <p className="body-copy mt-1">
            {listing.price_per_day_cents !== null && `${formatMoney(listing.price_per_day_cents)} / day`}
            {listing.price_per_day_cents !== null && listing.price_per_week_cents !== null && " · "}
            {listing.price_per_week_cents !== null && `${formatMoney(listing.price_per_week_cents)} / week`}
          </p>
        </div>
        <Badge variant={STATUS_BADGE_VARIANT[listing.status]}>{LISTING_STATUS_LABELS[listing.status]}</Badge>
      </div>

      {listing.status !== "REMOVED" && <ListingLifecycleActions listing={listing} />}
      <OwnerBookingList bookings={bookings} />
      {history && history.lifecycle_events.length > 0 && (
        <details className="mt-4 border-t border-line pt-3 text-xs">
          <summary className="cursor-pointer font-medium uppercase tracking-wide">Listing history</summary>
          <ul className="mt-2 space-y-1 text-ink-soft">
            {history.lifecycle_events.map((event) => (
              <li key={event.id}>{event.action.toLowerCase()} · {event.from_status} → {event.to_status}</li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}
