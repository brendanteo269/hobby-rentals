import type { Booking, BookingStatus } from "@/lib/bookings";
import type { BundleBooking } from "@/lib/bundles";

/**
 * S3-13: one card on the renter's dashboard. Single bookings and bundle
 * bookings are told apart by `kind` but shown alike, since to the renter both
 * are "something I have rented".
 */
export type RentalCard = {
  kind: "BOOKING" | "BUNDLE";
  id: string;
  /** The item, or the bundle. Null when it has no name to show. */
  name: string | null;
  /** Where the name links: the listing or the bundle. */
  href: `/listings/${string}` | `/bundles/${string}`;
  /** Where the full booking is, with its actions: the profile's renter tab. */
  detailsHref: `/profile?view=renter#${string}`;
  ownerName: string | null;
  startDate: string;
  endDate: string;
  status: BookingStatus;
  depositCents: number;
  /** S3-18: set while an active rental is late. */
  overdueSince: string | null;
};

export type RenterDashboard = {
  /** Out with the renter now, the one due back soonest first. */
  active: RentalCard[];
  /** Confirmed and not yet collected, the one starting soonest first. */
  upcoming: RentalCard[];
  /** Requests still waiting on an owner. Not rentals yet, so only counted. */
  pendingCount: number;
  /** Whether the renter has ever booked anything, whatever became of it. */
  hasAnyBooking: boolean;
};

function bookingCard(booking: Booking): RentalCard {
  return {
    kind: "BOOKING",
    id: booking.id,
    name: booking.listing_name ?? null,
    href: `/listings/${booking.listing_id}`,
    detailsHref: `/profile?view=renter#booking-${booking.id}`,
    ownerName: booking.owner_name ?? null,
    startDate: booking.start_date,
    endDate: booking.end_date,
    status: booking.status,
    depositCents: booking.deposit_cents ?? 0,
    overdueSince: booking.overdue_since ?? null,
  };
}

function bundleCard(booking: BundleBooking): RentalCard {
  return {
    kind: "BUNDLE",
    id: booking.id,
    name: booking.bundle_name,
    href: `/bundles/${booking.bundle_id}`,
    detailsHref: `/profile?view=renter#bundle-booking-${booking.id}`,
    ownerName: booking.owner_name ?? null,
    startDate: booking.start_date,
    endDate: booking.end_date,
    status: booking.status,
    depositCents: booking.deposit_cents ?? 0,
    overdueSince: null,
  };
}

/**
 * Sorts the renter's bookings into the dashboard's sections (Scenario 2).
 * Active is ACTIVE and upcoming is CONFIRMED; everything else - requests,
 * history - lives on the full bookings list.
 */
export function renterDashboard(bookings: Booking[], bundleBookings: BundleBooking[]): RenterDashboard {
  const cards = [...bookings.map(bookingCard), ...bundleBookings.map(bundleCard)];
  const byDate = (key: "startDate" | "endDate") => (a: RentalCard, b: RentalCard) => a[key].localeCompare(b[key]);

  return {
    active: cards.filter((card) => card.status === "ACTIVE").sort(byDate("endDate")),
    upcoming: cards.filter((card) => card.status === "CONFIRMED").sort(byDate("startDate")),
    pendingCount: cards.filter((card) => card.status === "PENDING").length,
    hasAnyBooking: cards.length > 0,
  };
}
