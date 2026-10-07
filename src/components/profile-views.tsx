import Link from "next/link";
import { Badge, Button, ButtonLink, EmptyState, ImageSlot } from "./ui";
import { enableRenting } from "@/app/profile/actions";
import { EnableOwningForm } from "@/components/enable-owning-form";
import { saveProfileAvailability } from "@/app/profile/actions";
import { ProfileAvailabilityCard } from "@/components/profile-availability-card";
import { RateLine } from "@/components/browse/listing-card";
import { MessageButton } from "@/components/messages/message-button";
import { CATEGORY_LABELS, LISTING_STATUS_LABELS, type Listing } from "@/lib/listings";
import { profilePath, type ProfileView } from "@/lib/routes";
import type { Booking } from "@/lib/bookings";
import type { BundleBooking } from "@/lib/bundles";
import { hasLiveOffer, WAITLIST_STATUS_LABELS, type WaitlistEntry } from "@/lib/waitlist";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_NEXT_STEP,
  BUNDLE_STATUS_NEXT_STEP,
  MESSAGEABLE_BOOKING_STATUSES,
  PAYMENT_STATUS_LABELS,
} from "@/lib/bookings";
import { CancelBookingButton } from "@/components/bookings/cancel-booking-button";
import { RENTER_CANCEL_OFFERED_STATUSES } from "@/lib/cancellations";
import { HashTargetHighlight } from "@/components/hash-target-highlight";
import { formatDate, formatDateTime } from "@/lib/format";

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
 * Shown when the member has not opted into this side yet, so an early
 * "rent only" choice never becomes a dead end.
 *
 * The two sides are not symmetrical. Renting is a single click — where a
 * booking is collected is agreed per booking, so there is nothing to ask.
 * Owning carries the pickup-location question onboarding would have asked,
 * which is why that side has a form of its own rather than a bare button.
 */
function NotEnabled({ side }: { side: "renter" | "owner" }) {
  if (side === "owner") {
    return (
      <EmptyState
        title="Owning is not switched on"
        body="Turn it on to create listings for the gear you already have and earn from it between uses."
        action={<EnableOwningForm />}
      />
    );
  }

  return (
    <EmptyState
      title="Renting is not switched on"
      body="Turn it on to book listings from people nearby. Nothing is charged until an owner accepts."
      action={
        <form action={enableRenting}>
          <Button type="submit">Start renting</Button>
        </form>
      }
    />
  );
}

export function RenterView({
  enabled,
  bookings = [],
  bundleBookings = [],
  waitlist = [],
}: {
  enabled: boolean;
  bookings?: Booking[];
  /** S2-20: a request for a whole set, shown beside the single-item ones. */
  bundleBookings?: BundleBooking[];
  /** S2-15: dates the renter is queueing for, which are not bookings yet. */
  waitlist?: WaitlistEntry[];
}) {
  if (!enabled) return <NotEnabled side="renter" />;
  if (bookings.length > 0 || bundleBookings.length > 0 || waitlist.length > 0) {
    return (
      <div>
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="eyebrow">Your rentals</p>
            <h2 className="heading mt-2 text-2xl">Bookings</h2>
          </div>
          <ButtonLink href="/browse" variant="outline" className="px-4 py-2 text-xs">Browse more</ButtonLink>
        </div>
        <HashTargetHighlight />
        <ul className="mt-6 space-y-3">
          {bundleBookings.map((booking) => (
            // The id is what a bundle notification's link scrolls to
            // (renter_bundle_booking_path in the backend's catalog).
            <li
              key={booking.id}
              id={`bundle-booking-${booking.id}`}
              className="flex scroll-mt-24 flex-wrap items-center justify-between gap-3 border border-line bg-white p-4 data-[hash-target]:border-ink data-[hash-target]:ring-1 data-[hash-target]:ring-ink"
            >
              <div>
                <Link href={`/bundles/${booking.bundle_id}`} className="font-medium hover:underline">
                  {booking.bundle_name ?? "View bundle"}
                </Link>
                <p className="mt-1 text-sm text-ink-soft">
                  {formatDate(booking.start_date)} – {formatDate(booking.end_date)}
                </p>
                {/* A bundle booking covers several listings at once, which the
                    dates alone would not tell the renter. */}
                <p className="mt-1 text-xs text-ink-soft">
                  {booking.items.length} items · {booking.items.map((item) => item.listing_name ?? "an item").join(", ")}
                </p>
                <p className="mt-1 text-sm text-ink">{BUNDLE_STATUS_NEXT_STEP[booking.status]}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant={booking.status === "CONFIRMED" || booking.status === "ACTIVE" ? "dark" : "neutral"}>{BOOKING_STATUS_LABELS[booking.status]}</Badge>
                {RENTER_CANCEL_OFFERED_STATUSES.includes(booking.status) && (
                  <CancelBookingButton kind="bundle" id={booking.id} status={booking.status} />
                )}
              </div>
            </li>
          ))}
          {bookings.map((booking) => (
            // The id is what a notification's link scrolls to
            // (renter_booking_path in the backend's catalog).
            <li
              key={booking.id}
              id={`booking-${booking.id}`}
              className="flex scroll-mt-24 flex-wrap items-center justify-between gap-3 border border-line bg-white p-4 data-[hash-target]:border-ink data-[hash-target]:ring-1 data-[hash-target]:ring-ink"
            >
              <div>
                <Link href={`/listings/${booking.listing_id}`} className="font-medium hover:underline">View listing</Link>
                <p className="mt-1 text-sm text-ink-soft">
                  {formatDate(booking.start_date)} – {formatDate(booking.end_date)}
                  {booking.payment_status && ` · ${PAYMENT_STATUS_LABELS[booking.payment_status]}`}
                </p>
                <p className="mt-1 text-sm text-ink">{BOOKING_STATUS_NEXT_STEP[booking.status]}</p>
                {booking.confirmed_meetup_location && (
                  <p className="mt-1 text-sm text-ink-soft">
                    Meetup: {booking.confirmed_meetup_location}
                    {booking.confirmed_meetup_time && `, ${formatDateTime(booking.confirmed_meetup_time)}`}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant={booking.status === "CONFIRMED" || booking.status === "ACTIVE" ? "dark" : "neutral"}>{BOOKING_STATUS_LABELS[booking.status]}</Badge>
                {RENTER_CANCEL_OFFERED_STATUSES.includes(booking.status) && (
                  <CancelBookingButton kind="booking" id={booking.id} status={booking.status} />
                )}
                {MESSAGEABLE_BOOKING_STATUSES.includes(booking.status) && (
                  <MessageButton target={{ kind: "booking", bookingId: booking.id }} className="px-3 py-1.5 text-xs" />
                )}
              </div>
            </li>
          ))}
        </ul>

        {/* S2-15: queue places are not bookings - nothing is held and no
            dates are reserved - so they sit in their own section rather than
            among the rentals above. */}
        {waitlist.length > 0 && (
          <div className="mt-10">
            <p className="eyebrow">Waiting on</p>
            <ul className="mt-4 space-y-3">
              {waitlist.map((entry) => (
                <li
                  key={entry.id}
                  className={`flex flex-wrap items-center justify-between gap-3 border p-4 ${
                    hasLiveOffer(entry) ? "border-accent bg-accent-soft" : "border-line bg-white"
                  }`}
                >
                  <div>
                    <Link href={`/listings/${entry.listing_id}`} className="font-medium hover:underline">
                      {entry.listing_name ?? "View listing"}
                    </Link>
                    <p className="mt-1 text-sm text-ink-soft">
                      {formatDate(entry.start_date)} – {formatDate(entry.end_date)}
                    </p>
                    {hasLiveOffer(entry) && (
                      <p className="mt-1 text-xs text-accent-dark">
                        Yours to book until {formatDateTime(entry.offer_expires_at!)}.
                      </p>
                    )}
                  </div>
                  <Badge variant={hasLiveOffer(entry) ? "accent" : "neutral"}>
                    {WAITLIST_STATUS_LABELS[entry.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
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
