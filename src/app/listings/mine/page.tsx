import { Container, ButtonLink, EmptyState } from "@/components/ui";
import { ListingLifecycleActions } from "@/components/listings/listing-lifecycle-actions";
import { getMyListings } from "@/lib/api/listings";
import { formatMoney } from "@/lib/format";
import { LISTING_STATUS_LABELS, LOCATION_LABELS, type Listing } from "@/lib/listings";

export const metadata = { title: "My listings — HobbyRentals" };

/**
 * The owner's rental inventory (S1-12): every listing they've created,
 * whatever its status, with archive/restore/remove controls per row.
 * Unlike Browse, this never filters to ACTIVE - an owner managing their
 * listings needs to see drafts, archived items and pending removals too.
 */
export default async function MyListingsPage() {
  const listings = await getMyListings();

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
              <ListingRow key={listing.id} listing={listing} />
            ))}
          </ul>
        )}
      </div>
    </Container>
  );
}

const STATUS_BADGE_STYLES: Record<Listing["status"], string> = {
  DRAFT: "bg-stone text-ink-soft",
  ACTIVE: "bg-sand text-ink",
  ARCHIVED: "bg-stone text-ink-soft",
  PENDING_REMOVAL: "bg-clay/15 text-ink",
  REMOVED: "bg-stone text-ink-soft",
};

function ListingRow({ listing }: { listing: Listing }) {
  return (
    <li className="border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{LOCATION_LABELS[listing.location_area]}</p>
          <h2 className="mt-1 text-base font-semibold uppercase tracking-wide">{listing.name}</h2>
          <p className="body-copy mt-1">
            {listing.price_per_day_cents !== null && `${formatMoney(listing.price_per_day_cents)} / day`}
            {listing.price_per_day_cents !== null && listing.price_per_week_cents !== null && " · "}
            {listing.price_per_week_cents !== null && `${formatMoney(listing.price_per_week_cents)} / week`}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide ${STATUS_BADGE_STYLES[listing.status]}`}
        >
          {LISTING_STATUS_LABELS[listing.status]}
        </span>
      </div>

      {listing.status !== "REMOVED" && <ListingLifecycleActions listing={listing} />}
    </li>
  );
}
