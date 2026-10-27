import { ButtonLink, EmptyState } from "@/components/ui";
import { RenterPortal, requireRenter } from "@/components/renter-portal";
import { RenterBookingList, RenterWaitlist } from "@/components/bookings/renter-booking-list";
import { ExportCalendarButton } from "@/components/bookings/export-calendar-button";
import { SuspensionBanner } from "@/components/bookings/suspension-banner";
import { getRenterActivity } from "@/lib/api/rentals";
import { isRentalFilter, matchesRentalFilter, RENTAL_FILTERS, type RentalFilter } from "@/lib/rentals";
import { renterBookingsPath } from "@/lib/routes";
import { SearchX, ShoppingBag } from "lucide-react";

export const metadata = { title: "Bookings — HobbyRentals" };

/**
 * Every booking the renter has made, with every action on it, filterable by
 * where it stands. Notification links scroll to a row here, so an unfiltered
 * visit must list every booking: a filter is only ever chosen by the renter.
 */
export default async function RenterBookingsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  await requireRenter();
  const { show } = await searchParams;
  const filter = isRentalFilter(show) ? show : undefined;
  const { bookings, bundleBookings, waitlist, reviewEligibility, suspension } = await getRenterActivity();

  const bookingsUnder = (value: RentalFilter | undefined) => {
    if (value === "waitlist") return { bookings: [], bundleBookings: [] };
    return {
      bookings: bookings.filter((booking) => matchesRentalFilter(booking.status, value)),
      bundleBookings: bundleBookings.filter((booking) => matchesRentalFilter(booking.status, value)),
    };
  };
  const countUnder = (value: RentalFilter) => {
    if (value === "waitlist") return waitlist.length;
    const shown = bookingsUnder(value);
    return shown.bookings.length + shown.bundleBookings.length;
  };
  const shown = bookingsUnder(filter);
  const showWaitlist = (!filter || filter === "waitlist") && waitlist.length > 0;
  const hasAnything = bookings.length + bundleBookings.length + waitlist.length > 0;
  const filterLabel = RENTAL_FILTERS.find((option) => option.value === filter)?.label;

  return (
    <RenterPortal active="Bookings" title="Bookings">
      {suspension && <SuspensionBanner status={suspension} />}
      <div className="mb-6 flex justify-end">
        <ExportCalendarButton role="renter" />
      </div>
      {!hasAnything ? (
        <EmptyState icon={ShoppingBag}
          title="You haven't rented anything yet"
          body="Listings you book will appear here, with collection dates and every step of the rental."
          action={<ButtonLink href="/browse">Browse the marketplace</ButtonLink>}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <nav aria-label="Filter bookings" className="flex flex-wrap gap-2">
              {([undefined, ...RENTAL_FILTERS.map((option) => option.value)] as const).map((value) => (
                <ButtonLink
                  key={value ?? "all"}
                  href={renterBookingsPath(value)}
                  variant={value === filter ? "solid" : "outline"}
                  aria-current={value === filter ? "page" : undefined}
                  className="px-3 py-1.5 text-xs"
                >
                  {value ? `${RENTAL_FILTERS.find((option) => option.value === value)!.label} (${countUnder(value)})` : "All"}
                </ButtonLink>
              ))}
            </nav>
            <ButtonLink href="/browse" variant="outline" className="px-4 py-2 text-xs">
              Browse more
            </ButtonLink>
          </div>

          <div className="mt-8 space-y-10">
            {shown.bookings.length + shown.bundleBookings.length > 0 && (
              <RenterBookingList
                bookings={shown.bookings}
                bundleBookings={shown.bundleBookings}
                reviewEligibility={reviewEligibility}
              />
            )}

            {/* S2-15: queue places are not bookings - nothing is held and no
                dates are reserved - so they sit apart from the rentals. */}
            {showWaitlist && (
              <section aria-labelledby="waitlist-heading">
                <h2 id="waitlist-heading" className="heading text-xl">
                  Waiting on
                </h2>
                <div className="mt-4">
                  <RenterWaitlist waitlist={waitlist} />
                </div>
              </section>
            )}

            {filter && countUnder(filter) === 0 && (
              <EmptyState icon={SearchX}
                title={filter === "waitlist" ? "You're not queueing for anything" : `No ${filterLabel!.toLowerCase()} bookings`}
                body="Try another filter, or show all your bookings."
                action={
                  <ButtonLink href={renterBookingsPath()} variant="outline">
                    Show all
                  </ButtonLink>
                }
              />
            )}
          </div>
        </>
      )}
    </RenterPortal>
  );
}
