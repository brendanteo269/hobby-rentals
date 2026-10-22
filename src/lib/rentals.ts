import type { Route } from "next";
import type { Booking, BookingStatus } from "@/lib/bookings";
import type { BundleBooking } from "@/lib/bundles";
import { formatDate, formatDateTime, todayIso } from "@/lib/format";
import { canConfirmHandover } from "@/lib/handover";
import { canConfirmReturn, canStartPickupInspection } from "@/lib/returns";
import { reviewPath, type ReviewEligibility } from "@/lib/reviews";
import { claimPendingRenter, renterClaimPath } from "@/lib/settlement";
import { hasLiveOffer, type WaitlistEntry } from "@/lib/waitlist";

/**
 * The id of a booking's row on the Bookings tab, which a notification's
 * fragment and the overview's links both scroll to. The backend's catalog
 * spells the same ids (renter_booking_path, renter_bundle_booking_path).
 */
export function rentalRowId(kind: "BOOKING" | "BUNDLE", id: string): `booking-${string}` | `bundle-booking-${string}` {
  return kind === "BUNDLE" ? `bundle-booking-${id}` : `booking-${id}`;
}

/**
 * S3-13: one card on the renter's dashboard. Single bookings and bundle
 * bookings are told apart by `kind` but shown alike, since to the renter both
 * are "something I have rented".
 */
export type RentalCard = {
  kind: "BOOKING" | "BUNDLE";
  id: string;
  rowId: ReturnType<typeof rentalRowId>;
  /** The item, or the bundle. Null when it has no name to show. */
  name: string | null;
  /** Where the name links: the listing or the bundle. */
  href: `/listings/${string}` | `/bundles/${string}`;
  /** Where the full booking is, with its actions: its row on the Bookings tab. */
  detailsHref: `/rentals/bookings#${string}`;
  ownerName: string | null;
  startDate: string;
  endDate: string;
  status: BookingStatus;
  depositCents: number;
  /** S3-18: set while an active rental is late. */
  overdueSince: string | null;
  /** S2-19: the agreed handover place and time, when one has been accepted. */
  meetup: string | null;
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
    rowId: rentalRowId("BOOKING", booking.id),
    name: booking.listing_name ?? null,
    href: `/listings/${booking.listing_id}`,
    detailsHref: `/rentals/bookings#booking-${booking.id}`,
    ownerName: booking.owner_name ?? null,
    startDate: booking.start_date,
    endDate: booking.end_date,
    status: booking.status,
    depositCents: booking.deposit_cents ?? 0,
    overdueSince: booking.overdue_since ?? null,
    meetup: booking.confirmed_meetup_location
      ? [booking.confirmed_meetup_location, booking.confirmed_meetup_time && formatDateTime(booking.confirmed_meetup_time)]
          .filter(Boolean)
          .join(", ")
      : null,
  };
}

function bundleCard(booking: BundleBooking): RentalCard {
  return {
    kind: "BUNDLE",
    id: booking.id,
    rowId: rentalRowId("BUNDLE", booking.id),
    name: booking.bundle_name,
    href: `/bundles/${booking.bundle_id}`,
    detailsHref: `/rentals/bookings#bundle-booking-${booking.id}`,
    ownerName: booking.owner_name ?? null,
    startDate: booking.start_date,
    endDate: booking.end_date,
    status: booking.status,
    depositCents: booking.deposit_cents ?? 0,
    overdueSince: null,
    meetup: null,
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

/** The Bookings tab's filters, which are also the legal values of its `?show=` parameter. */
export type RentalFilter = "requests" | "upcoming" | "active" | "past" | "cancelled" | "waitlist";

export const RENTAL_FILTERS: readonly { value: RentalFilter; label: string }[] = [
  { value: "requests", label: "Requests" },
  { value: "upcoming", label: "Upcoming" },
  { value: "active", label: "Active" },
  { value: "past", label: "Past" },
  { value: "cancelled", label: "Cancelled" },
  { value: "waitlist", label: "Waitlist" },
];

/** Which booking statuses each filter shows. The waitlist is not bookings, so it has none. */
const FILTER_STATUSES: Record<Exclude<RentalFilter, "waitlist">, readonly BookingStatus[]> = {
  requests: ["PENDING"],
  upcoming: ["CONFIRMED"],
  active: ["ACTIVE"],
  past: ["COMPLETED"],
  cancelled: ["DECLINED", "CANCELLED", "EXPIRED"],
};

export function isRentalFilter(value: string | undefined): value is RentalFilter {
  return RENTAL_FILTERS.some((filter) => filter.value === value);
}

/** Whether a booking belongs under a filter; with none, every booking does. */
export function matchesRentalFilter(status: BookingStatus, filter: Exclude<RentalFilter, "waitlist"> | undefined): boolean {
  return !filter || FILTER_STATUSES[filter].includes(status);
}

/**
 * One thing waiting on the renter, for the overview's "Needs your action".
 *
 * Confirming a handover or a return is a button with its own dialog rather
 * than a page, so those carry the booking instead of a link and the page
 * renders the same button the booking's row has.
 */
export type RenterActionItem = {
  /** The booking row it belongs to, so a card can show its own next step. Null for a waitlist offer, which is not a booking yet. */
  rowId: ReturnType<typeof rentalRowId> | null;
  name: string;
  title: string;
  detail: string | null;
  /** Late, or with money at stake: sorted first and shown in the accent colour. */
  urgent: boolean;
  action:
    | { kind: "link"; href: Route; label: string }
    | { kind: "confirm-handover" | "confirm-return"; bookingId: string };
};

/**
 * Everything waiting on the renter, most pressing first. Built from the same
 * rules the booking rows use to show their buttons, so the two cannot
 * disagree about what is possible; the server re-checks each one anyway.
 */
export function renterActionItems(
  {
    bookings,
    bundleBookings,
    waitlist,
    reviewEligibility,
  }: {
    bookings: Booking[];
    bundleBookings: BundleBooking[];
    waitlist: WaitlistEntry[];
    reviewEligibility: ReviewEligibility[];
  },
  today: string = todayIso(),
  now: Date = new Date(),
): RenterActionItem[] {
  const items: RenterActionItem[] = [];

  for (const booking of bookings) {
    const rowId = rentalRowId("BOOKING", booking.id);
    const name = booking.listing_name ?? "Your rental";

    if (claimPendingRenter(booking.settlement_state?.dispute, now)) {
      items.push({
        rowId,
        name,
        title: "The owner has reported damage",
        detail: "Accept the claim or dispute it before the deadline.",
        urgent: true,
        action: { kind: "link", href: renterClaimPath(booking.id) as Route, label: "Review claim" },
      });
    }

    // Pickup photos are only nagged about once the rental has begun; before
    // then they are possible but not yet due.
    if (canStartPickupInspection(booking, today) && booking.pickup_inspection_status !== "COMPLETED" && booking.start_date <= today) {
      items.push({
        rowId,
        name,
        title: booking.pickup_inspection_status === "IN_PROGRESS" ? "Finish the pickup photos" : "Take the pickup photos",
        detail: booking.start_date === today ? "Collecting today" : `Rental started ${formatDate(booking.start_date)}`,
        urgent: false,
        action: { kind: "link", href: `/bookings/${booking.id}/pickup` as Route, label: "Pickup photos" },
      });
    }

    if (canConfirmHandover(booking, "renter", today)) {
      items.push({
        rowId,
        name,
        title: "Confirm you have collected it",
        detail: null,
        urgent: false,
        action: { kind: "confirm-handover", bookingId: booking.id },
      });
    }

    const returnPhotosDone = booking.return_state?.inspection_status === "COMPLETED";
    if (booking.status === "ACTIVE" && !returnPhotosDone && (booking.overdue_since || booking.end_date <= today)) {
      items.push({
        rowId,
        name,
        title: booking.return_state?.inspection_status === "IN_PROGRESS" ? "Finish the return photos" : "Take the return photos",
        detail: booking.overdue_since
          ? `Overdue since ${formatDate(booking.overdue_since)}`
          : booking.end_date === today
            ? "Due back today"
            : `Was due back ${formatDate(booking.end_date)}`,
        urgent: Boolean(booking.overdue_since),
        action: { kind: "link", href: `/bookings/${booking.id}/return` as Route, label: "Return photos" },
      });
    }

    if (returnPhotosDone && canConfirmReturn(booking, "renter")) {
      items.push({
        rowId,
        name,
        title: "Confirm the return",
        detail: "Once the owner has the item back.",
        urgent: false,
        action: { kind: "confirm-return", bookingId: booking.id },
      });
    }
  }

  for (const entry of waitlist) {
    if (!hasLiveOffer(entry, now)) continue;
    items.push({
      rowId: null,
      name: entry.listing_name ?? "A listing you queued for",
      title: "Your turn to book",
      detail: `${formatDate(entry.start_date)} – ${formatDate(entry.end_date)}, yours until ${formatDateTime(entry.offer_expires_at!)}`,
      urgent: true,
      action: { kind: "link", href: `/listings/${entry.listing_id}` as Route, label: "Book now" },
    });
  }

  // Only the renter's own reviews of owners: a member who also owns has
  // renters to review too, and those belong to the owner portal.
  const ownBookingIds = new Set(bookings.map((booking) => booking.id));
  const ownBundleIds = new Set(bundleBookings.map((booking) => booking.id));
  for (const review of reviewEligibility) {
    if (review.reviewed_role !== "OWNER") continue;
    const kind = review.bundle_booking_id ? "BUNDLE" : "BOOKING";
    const id = review.bundle_booking_id ?? review.booking_id;
    if (!id || !(kind === "BUNDLE" ? ownBundleIds : ownBookingIds).has(id)) continue;
    items.push({
      rowId: rentalRowId(kind, id),
      name: review.rental_name,
      title: "Rate the owner",
      detail: `Open until ${formatDate(review.expires_at)}`,
      urgent: false,
      action: { kind: "link", href: reviewPath(review), label: "Rate owner" },
    });
  }

  // Stable, so items keep their booking order within each group.
  return items.sort((a, b) => Number(b.urgent) - Number(a.urgent));
}
