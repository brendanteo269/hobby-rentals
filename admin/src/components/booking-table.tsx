import Link from "next/link";
import { Badge, EmptyState } from "./ui";
import { ROUTES } from "@/lib/routes";
import { formatDate, formatDateTime, formatMoney, shortId } from "@/lib/format";
import { bookingStatusLabel, bookingStatusTone, type AdminBookingSummary } from "@/lib/bookings";

/**
 * Search results.
 *
 * Every row links to the booking's own detail page rather than expanding in
 * place - same reasoning as ListingTable/UserTable: the detail is where an
 * administrator actually investigates something, not a list that has
 * scrolled.
 */
export function BookingTable({ bookings }: { bookings: AdminBookingSummary[] }) {
  if (bookings.length === 0) {
    return (
      <EmptyState
        title="No matching bookings"
        body="Search by booking ID, listing name, renter, owner, or status. Partial matches are fine."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-7xl border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            <th scope="col" className="eyebrow px-6 py-3 font-normal">Booking</th>
            <th scope="col" className="eyebrow px-6 py-3 font-normal">Booking ID</th>
            <th scope="col" className="eyebrow px-6 py-3 font-normal">Status</th>
            <th scope="col" className="eyebrow px-6 py-3 font-normal">Renter</th>
            <th scope="col" className="eyebrow px-6 py-3 font-normal">Renter email</th>
            <th scope="col" className="eyebrow px-6 py-3 font-normal">Owner</th>
            <th scope="col" className="eyebrow px-6 py-3 font-normal">Start date</th>
            <th scope="col" className="eyebrow px-6 py-3 font-normal">End date</th>
            <th scope="col" className="eyebrow px-6 py-3 font-normal">Amount</th>
            <th scope="col" className="eyebrow px-6 py-3 font-normal">Created</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id} className="border-b border-line last:border-0 hover:bg-sand">
              <td className="px-6 py-4">
                <Link href={ROUTES.booking(booking.id)} className="font-medium underline-offset-4 hover:underline">
                  {booking.listing_name}
                </Link>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-ink-soft">
                <Link href={ROUTES.booking(booking.id)} className="hover:underline">
                  {shortId(booking.id)}
                </Link>
              </td>
              <td className="px-6 py-4">
                <Badge tone={bookingStatusTone(booking.status)}>{bookingStatusLabel(booking.status)}</Badge>
              </td>
              <td className="px-6 py-4">
                <Link href={ROUTES.user(booking.renter_id)} className="underline-offset-4 hover:underline">
                  {booking.renter_display_name ?? "No name"}
                </Link>
              </td>
              <td className="px-6 py-4 text-ink-soft">{booking.renter_email ?? "No email"}</td>
              <td className="px-6 py-4">
                <Link href={ROUTES.user(booking.owner_id)} className="underline-offset-4 hover:underline">
                  {booking.owner_display_name ?? "No name"}
                </Link>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-ink-soft">{formatDate(booking.start_date)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-ink-soft">{formatDate(booking.end_date)}</td>
              <td className="px-6 py-4 whitespace-nowrap">{formatMoney(booking.total_amount_cents)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-ink-soft">{formatDateTime(booking.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
