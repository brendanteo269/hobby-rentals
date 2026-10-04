import Link from "next/link";
import { Badge, ButtonLink, EmptyState } from "@/components/ui";
import { OwnerPortal, requireOwner } from "@/components/owner-portal";
import { ListingLifecycleActions } from "@/components/listings/listing-lifecycle-actions";
import { BundleRow } from "@/components/bundles/bundle-row";
import { getListingHistory, getMyListings, type ListingHistory } from "@/lib/api/listings";
import { getBundleEvents, getMyBundles, getOwnerBundleBookings } from "@/lib/api/bundles";
import { getOwnerBookings } from "@/lib/api/bookings";
import { formatMoney } from "@/lib/format";
import {
  CATEGORY_LABELS,
  LISTING_STATUS_LABELS,
  LOCATION_LABELS,
  type Listing,
  type ListingStatus,
  type OwnerListing,
} from "@/lib/listings";
import { OwnerBookingList } from "@/components/bookings/owner-booking-list";
import type { Booking } from "@/lib/bookings";

export const metadata = { title: "My listings — HobbyRentals" };

/**
 * The owner's rental inventory (S1-12): every listing they've created,
 * whatever its status, with archive/restore/remove controls per row.
 * Unlike Browse, this never filters to ACTIVE - an owner managing their
 * listings needs to see drafts, archived items and pending removals too.
 *
 * S2-01: filterable by status. Filtered here rather than by the API: the
 * page needs the full list anyway to tell "no listings yet" apart from
 * "none with this status".
 *
 * S2-20: gear bundles are part of the same inventory and live in their own
 * section below. The status filter above applies to items only - a bundle
 * carries its own, different set of statuses - so the two sections are
 * labelled rather than left to run together.
 */
export default async function MyListingsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireOwner();
  const { status } = await searchParams;
  const filter = status && status in LISTING_STATUS_LABELS ? (status as ListingStatus) : undefined;
  const [allListings, bookings, bundles, bundleBookings] = await Promise.all([
    getMyListings(),
    getOwnerBookings(),
    getMyBundles(),
    getOwnerBundleBookings(),
  ]);
  const listings = filter ? allListings.filter((listing) => listing.status === filter) : allListings;
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

  // Supplementary, like the listing histories above: a hiccup reading a
  // bundle's event trail must not cost the owner the rest of the page.
  const trails = await Promise.all(
    bundles.map(async (bundle) => {
      try {
        return [bundle.id, await getBundleEvents(bundle.id)] as const;
      } catch {
        return [bundle.id, undefined] as const;
      }
    }),
  );
  const eventsByBundle = new Map(trails);

  return (
    <OwnerPortal active="Inventory" title="My listings">
      {allListings.length > 0 && (
        <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
          {([undefined, ...(Object.keys(LISTING_STATUS_LABELS) as ListingStatus[])] as const).map((value) => (
            <ButtonLink
              key={value ?? "ALL"}
              href={value ? `/listings/mine?status=${value}` : "/listings/mine"}
              variant={value === filter ? "solid" : "outline"}
              aria-current={value === filter ? "page" : undefined}
              className="px-3 py-1.5 text-xs"
            >
              {value ? LISTING_STATUS_LABELS[value] : "All"}
            </ButtonLink>
          ))}
        </nav>
      )}

      <div className="mt-8">
        <h2 className="eyebrow">Items</h2>
        <div className="mt-3">
          {allListings.length === 0 ? (
            <EmptyState
              title="No listings yet"
              body="Once you list a piece of gear, it'll show up here so you can manage its availability, archive it, or remove it."
              action={<ButtonLink href="/listings/new">Create your first listing</ButtonLink>}
            />
          ) : listings.length === 0 ? (
            <EmptyState
              title={`No ${LISTING_STATUS_LABELS[filter!].toLowerCase()} listings`}
              body="Try another status, or show all your listings."
              action={<ButtonLink href="/listings/mine" variant="outline">Show all</ButtonLink>}
            />
          ) : (
            <ul className="space-y-4">
              {listings.map((listing) => (
                <ListingRow key={listing.id} listing={listing} bookings={bookings.filter((booking) => booking.listing_id === listing.id)} history={historyByListing.get(listing.id)} />
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-12">
        {/* No "new bundle" button here: that action lives in the site header
            beside "+ New Listing", so there is one place to start either kind
            of inventory from. */}
        <h2 className="eyebrow">Bundles</h2>
        <p className="body-copy mt-1 max-w-xl">
          Related gear grouped into one named set at a package rate. The listings inside stay published and bookable on their own.
        </p>

        <div className="mt-4">
          {bundles.length === 0 ? (
            <EmptyState
              title="No bundles yet"
              body="Bundle two or more of your published listings so renters can book a common set of gear in one go."
              action={<ButtonLink href="/listings/mine/bundles/new">Create your first bundle</ButtonLink>}
            />
          ) : (
            <ul className="space-y-4">
              {bundles.map((bundle) => (
                <BundleRow
                  key={bundle.id}
                  bundle={bundle}
                  bookings={bundleBookings.filter((booking) => booking.bundle_id === bundle.id)}
                  events={eventsByBundle.get(bundle.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

    </OwnerPortal>
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

function ListingRow({ listing, bookings, history }: { listing: OwnerListing; bookings: Booking[]; history?: ListingHistory }) {
  return (
    <li className="border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{CATEGORY_LABELS[listing.category]} · {LOCATION_LABELS[listing.location_area]}</p>
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
        <div className="flex flex-wrap gap-2">
          {/* Removed items can't be finished, so there's nothing to flag. */}
          {listing.passport_missing.length > 0 && listing.status !== "REMOVED" && (
            <Link href={`/listings/${listing.id}/passport`} className="hover:underline">
              <Badge variant="accent">Passport incomplete</Badge>
            </Link>
          )}
          <Badge variant={STATUS_BADGE_VARIANT[listing.status]}>{LISTING_STATUS_LABELS[listing.status]}</Badge>
        </div>
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
