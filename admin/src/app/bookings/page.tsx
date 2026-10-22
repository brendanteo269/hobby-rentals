import type { Route } from "next";
import { redirect } from "next/navigation";
import { requirePortalSession } from "@/lib/admin";
import {
  bookingStatusLabel,
  getEnforcementFlaggedBookings,
  ESCROW_FILTERS,
  getUnconfirmedHandoverQueue,
  searchBookings,
  PAGE_SIZE,
} from "@/lib/bookings";
import { formatDate, shortId } from "@/lib/format";
import { formatCaseAge } from "@/lib/moderation";
import { ROUTES } from "@/lib/routes";
import Link from "next/link";
import { Badge, Container, Panel } from "@/components/ui";
import { BookingSearch } from "@/components/booking-search";
import { BookingTable } from "@/components/booking-table";
import { Pagination } from "@/components/pagination";

export const metadata = { title: "Bookings — HobbyRentals Admin" };

/**
 * S2-27: search bookings by id, listing, renter, owner, or status, and jump
 * into one to inspect its state and escrow linkage. Read-only - there is no
 * action here that changes a booking's outcome, only the search/view pair
 * the story asks for.
 */
export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string | string[]; escrow?: string | string[]; page?: string }>;
}) {
  // The proxy already turned away anyone without the portal password.
  // Repeated here because a page that reads booking/party data should not
  // depend on middleware having run - a matcher change is one edit away from
  // silently exposing it.
  await requirePortalSession();

  const { q = "", status, escrow, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  // Empty means "any" - no status filter leaves every booking in the result set.
  const statuses = Array.isArray(status) ? status : status ? [status] : [];
  const escrowFilters = (Array.isArray(escrow) ? escrow : escrow ? [escrow] : []).filter((e) =>
    (ESCROW_FILTERS as readonly string[]).includes(e),
  );

  const [{ bookings, total, error }, unconfirmedHandovers, enforcementFlagged] = await Promise.all([
    searchBookings(q, statuses, page, escrowFilters),
    getUnconfirmedHandoverQueue(),
    getEnforcementFlaggedBookings(),
  ]);

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // A page past the end of the result set (a bookmarked or shared link whose
  // matches have since shrunk) would otherwise render as a false "no
  // bookings match this search" - send it back to the real last page instead.
  if (page > lastPage) redirect(hrefForBookingsPage(q, statuses, escrowFilters, lastPage) as Route);

  const description = error
    ? error
    : total === 0
      ? "No bookings match this search."
      : `${total} booking${total === 1 ? "" : "s"}${q || statuses.length > 0 || escrowFilters.length > 0 ? " matching this search" : ""}.`;

  return (
    <Container className="py-12">
      <p className="eyebrow">Admin</p>
      <h1 className="display-caps mt-3 text-3xl">Bookings</h1>

      {/* S3-02: rentals past their start date that the renter and owner have not both confirmed. */}
      <div className="mt-8">
        <Panel
          title="Unconfirmed handovers"
          description={
            unconfirmedHandovers.length === 0
              ? "Nothing waiting. Rentals whose handover nobody confirmed show up here once their start date has passed."
              : `${unconfirmedHandovers.length} rental${unconfirmedHandovers.length === 1 ? "" : "s"} past the start date without both parties confirming the handover, longest overdue first.`
          }
        >
          {unconfirmedHandovers.length > 0 && (
            <ul className="-mx-6 -my-5 divide-y divide-line">
              {unconfirmedHandovers.map((booking) => (
                <li key={booking.id}>
                  <Link
                    href={ROUTES.booking(booking.id)}
                    className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 hover:bg-sand"
                  >
                    <span>
                      <span className="font-medium">{booking.listing_name}</span>
                      <span className="mt-0.5 block text-xs text-ink-soft">
                        {booking.renter_name ?? "A renter"} renting from {booking.owner_name ?? "an owner"} ·{" "}
                        {shortId(booking.id)} · due {formatDate(booking.start_date)}, overdue {formatCaseAge(booking.overdue_seconds)}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge tone={booking.renter_confirmed ? "positive" : "warning"}>
                        Renter {booking.renter_confirmed ? "confirmed" : "not confirmed"}
                      </Badge>
                      <Badge tone={booking.owner_confirmed ? "positive" : "warning"}>
                        Owner {booking.owner_confirmed ? "confirmed" : "not confirmed"}
                      </Badge>
                      {!booking.pickup_photos_done && <Badge tone="critical">No pickup photos</Badge>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* S3-24: bookings a suspension or ban left for an administrator. */}
      {enforcementFlagged.length > 0 && (
        <div className="mt-8">
          <Panel
            title="Member suspended or banned"
            description="A member in these bookings was suspended or banned. A rental that is out is not cancelled from under the other person, so each is for you to settle."
          >
            <ul className="divide-y divide-line text-sm">
              {enforcementFlagged.map((booking) => (
                <li key={booking.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <Link href={ROUTES.booking(booking.id)} className="font-medium underline-offset-4 hover:underline">
                    {booking.listing_name}
                  </Link>
                  <span className="text-ink-soft">
                    {shortId(booking.id)} · {bookingStatusLabel(booking.status)} · {formatDate(booking.start_date)} –{" "}
                    {formatDate(booking.end_date)}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}

      <div className="mt-8">
        <BookingSearch query={q} statuses={statuses} escrow={escrowFilters} />
      </div>

      <div className="mt-8">
        <Panel title="Bookings" description={description}>
          <div className="-mx-6 -my-5">
            <BookingTable bookings={bookings} />
          </div>
        </Panel>
      </div>

      <Pagination page={page} lastPage={lastPage} hrefForPage={(p) => hrefForBookingsPage(q, statuses, escrowFilters, p)} />
    </Container>
  );
}

function hrefForBookingsPage(q: string, statuses: string[], escrow: string[], page: number): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  statuses.forEach((s) => params.append("status", s));
  escrow.forEach((e) => params.append("escrow", e));
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `${ROUTES.bookings}?${search}` : ROUTES.bookings;
}
