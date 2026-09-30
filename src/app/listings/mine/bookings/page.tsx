import Link from "next/link";
import { EmptyState } from "@/components/ui";
import { OwnerPortal, requireOwner } from "@/components/owner-portal";
import { OwnerBookingList } from "@/components/bookings/owner-booking-list";
import { getOwnerBookings } from "@/lib/api/bookings";
import { getMyListings } from "@/lib/api/listings";

export const metadata = { title: "Bookings — HobbyRentals" };

/** Every booking request across the owner's listings, grouped by listing. */
export default async function OwnerBookingsPage() {
  await requireOwner();
  const [listings, bookings] = await Promise.all([getMyListings(), getOwnerBookings()]);
  const booked = listings.filter((listing) => bookings.some((booking) => booking.listing_id === listing.id));

  return (
    <OwnerPortal active="Bookings" title="Bookings">
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
