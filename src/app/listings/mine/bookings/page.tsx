import Link from "next/link";
import { EmptyState } from "@/components/ui";
import { OwnerPortal, requireOwner } from "@/components/owner-portal";
import { OwnerBookingList } from "@/components/bookings/owner-booking-list";
import { RequestCountdown } from "@/components/bookings/request-countdown";
import { getOwnerBookingRequests, getOwnerBookings } from "@/lib/api/bookings";
import { getMyListings } from "@/lib/api/listings";
import { requestReviewPath } from "@/lib/bookings";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Bookings — HobbyRentals" };

/**
 * The requests waiting on the owner, the one about to lapse first, then every
 * booking across their listings, grouped by listing.
 */
export default async function OwnerBookingsPage() {
  await requireOwner();
  const [listings, bookings, requests] = await Promise.all([
    getMyListings(),
    getOwnerBookings(),
    getOwnerBookingRequests(),
  ]);
  const booked = listings.filter((listing) => bookings.some((booking) => booking.listing_id === listing.id));

  return (
    <OwnerPortal active="Bookings" title="Bookings">
      {requests.length > 0 && (
        <section className="mb-10" aria-labelledby="requests-heading">
          <h2 id="requests-heading" className="heading text-xl">Booking requests</h2>
          <ul className="mt-4 divide-y divide-line border border-line bg-white">
            {requests.map((request) => (
              <li key={request.id}>
                <Link
                  href={requestReviewPath(request.kind, request.id)}
                  className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 hover:bg-surface-muted"
                >
                  <span>
                    <span className="font-semibold">{request.name ?? (request.kind === "BUNDLE" ? "Bundle" : "Listing")}</span>
                    {request.kind === "BUNDLE" && <span className="text-ink-soft"> · Bundle of {request.item_count}</span>}
                    <span className="text-ink-soft"> · {request.renter_display_name ?? "Unnamed member"}</span>
                    <span className="block text-sm text-ink-soft">
                      {formatDate(request.start_date)} – {formatDate(request.end_date)}
                    </span>
                  </span>
                  <span className="text-sm"><RequestCountdown expiresInSeconds={request.expires_in_seconds} /></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {booked.length === 0 ? (
        <EmptyState
          title="No booking requests yet"
          body="When a renter asks to book one of your listings, the request shows up here for you to confirm or decline."
        />
      ) : (
        <ul className="space-y-4">
          {booked.map((listing) => (
            <li key={listing.id} className="border border-line bg-white p-5">
              <h2 className="text-base font-semibold uppercase tracking-wide">
                <Link href={`/listings/${listing.id}`} className="hover:underline">{listing.name}</Link>
              </h2>
              <OwnerBookingList bookings={bookings.filter((booking) => booking.listing_id === listing.id)} />
            </li>
          ))}
        </ul>
      )}
    </OwnerPortal>
  );
}
