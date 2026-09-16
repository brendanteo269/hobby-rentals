import Link from "next/link";
import { Badge, Button, ButtonLink, EmptyState, ImageSlot } from "./ui";
import { enableRenting, enableOwning } from "@/app/profile/actions";
import { saveProfileAvailability } from "@/app/profile/actions";
import { ProfileAvailabilityCard } from "@/components/profile-availability-card";
import { RateLine } from "@/components/browse/listing-card";
import { CATEGORY_LABELS, LISTING_STATUS_LABELS, type Listing } from "@/lib/listings";
import { profilePath, type ProfileView } from "@/lib/routes";

export type { ProfileView } from "@/lib/routes";

const TABS: { view: ProfileView; label: string }[] = [
  { view: "renter", label: "Renting" },
  { view: "owner", label: "Owning" },
  { view: "wallet", label: "Wallet" },
  { view: "account", label: "Account" },
];

/** Switches between the sides of the marketplace and the account panels. */
export function ViewTabs({ active }: { active: ProfileView }) {
  return (
    <nav className="flex gap-6 border-b border-line" aria-label="Profile view">
      {TABS.map((tab) => {
        const isActive = tab.view === active;
        return (
          <Link
            key={tab.view}
            href={profilePath(tab.view)}
            aria-current={isActive ? "page" : undefined}
            className={`-mb-px border-b-2 px-1 pb-3 text-sm transition-colors ${
              isActive
                ? "border-ink font-medium text-ink"
                : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Shown when the member has not opted into this side yet. Turning it on is a
 * single click, so an early "rent only" choice never becomes a dead end.
 */
function NotEnabled({ side }: { side: "renter" | "owner" }) {
  const copy =
    side === "renter"
      ? {
          title: "Renting is not switched on",
          body: "Turn it on to book listings from people nearby. Nothing is charged until an owner accepts.",
          label: "Start renting",
          action: enableRenting,
        }
      : {
          title: "Owning is not switched on",
          body: "Turn it on to create listings for the gear you already have and earn from it between uses.",
          label: "Start listing",
          action: enableOwning,
        };

  return (
    <EmptyState
      title={copy.title}
      body={copy.body}
      action={
        <form action={copy.action}>
          <Button type="submit">{copy.label}</Button>
        </form>
      }
    />
  );
}

export function RenterView({ enabled }: { enabled: boolean }) {
  if (!enabled) return <NotEnabled side="renter" />;
  return (
    <EmptyState
      title="No bookings yet"
      body="Listings you book will appear here, with collection dates and the owner's details."
      action={<ButtonLink href="/browse">Browse listings</ButtonLink>}
    />
  );
}

/**
 * An owner's own listing, styled like the browse grid's ListingCard — same
 * photo/badge/price shell — with a status badge added, since that only
 * makes sense from the owner's own management view.
 */
function OwnerListingCard({ listing }: { listing: Listing }) {
  return (
    <li className="overflow-hidden card">
      <div className="relative overflow-hidden">
        {/* Every real listing has at least one uploaded photo (see
            CreateListingRequest's photo_keys validator), so photo_urls[0]
            is always set here - no stock-photo fallback needed. */}
        <ImageSlot
          label={listing.photo_keys[0] ?? "No photo yet"}
          src={listing.photo_urls[0]}
          className="aspect-square w-full"
        />
        <Badge variant={listing.status === "ACTIVE" ? "dark" : "neutral"} className="absolute left-3 top-3">
          {LISTING_STATUS_LABELS[listing.status]}
        </Badge>
      </div>

      <div className="p-4">
        <p className="eyebrow">{CATEGORY_LABELS[listing.category]}</p>
        <h3 className="heading mt-1.5 text-sm leading-snug">{listing.name}</h3>

        <div className="mt-3 border-t border-line pt-3">
          <RateLine listing={listing} />
        </div>
      </div>
    </li>
  );
}

export function OwnerView({
  enabled,
  availableDays = [1, 2, 3, 4, 5, 6, 7],
  listings,
}: {
  enabled: boolean;
  availableDays?: number[];
  listings: Listing[];
}) {
  if (!enabled) return <NotEnabled side="owner" />;
  return (
    <div className="space-y-6">
      <ProfileAvailabilityCard availableDays={availableDays} action={saveProfileAvailability} />
      {listings.length > 0 ? (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {listings.map((listing) => (
            <OwnerListingCard key={listing.id} listing={listing} />
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No listings yet"
          body="Listings you create will appear here, along with requests from people wanting to book them."
          action={<ButtonLink href="/listings/new">Create a listing</ButtonLink>}
        />
      )}
    </div>
  );
}
