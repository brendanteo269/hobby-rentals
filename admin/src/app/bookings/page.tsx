import type { Route } from "next";
import { redirect } from "next/navigation";
import { requirePortalSession } from "@/lib/admin";
import { searchBookings, PAGE_SIZE } from "@/lib/bookings";
import { ROUTES } from "@/lib/routes";
import { Container, Panel } from "@/components/ui";
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
  searchParams: Promise<{ q?: string; status?: string | string[]; page?: string }>;
}) {
  // The proxy already turned away anyone without the portal password.
  // Repeated here because a page that reads booking/party data should not
  // depend on middleware having run - a matcher change is one edit away from
  // silently exposing it.
  await requirePortalSession();

  const { q = "", status, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  // Empty means "any" - no status filter leaves every booking in the result set.
  const statuses = Array.isArray(status) ? status : status ? [status] : [];

  const { bookings, total, error } = await searchBookings(q, statuses, page);

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // A page past the end of the result set (a bookmarked or shared link whose
  // matches have since shrunk) would otherwise render as a false "no
  // bookings match this search" - send it back to the real last page instead.
  if (page > lastPage) redirect(hrefForBookingsPage(q, statuses, lastPage) as Route);

  const description = error
    ? error
    : total === 0
      ? "No bookings match this search."
      : `${total} booking${total === 1 ? "" : "s"}${q || statuses.length > 0 ? " matching this search" : ""}.`;

  return (
    <Container className="py-12">
      <p className="eyebrow">Admin</p>
      <h1 className="display-caps mt-3 text-3xl">Bookings</h1>

      <div className="mt-8">
        <BookingSearch query={q} statuses={statuses} />
      </div>

      <div className="mt-8">
        <Panel title="Bookings" description={description}>
          <div className="-mx-6 -my-5">
            <BookingTable bookings={bookings} />
          </div>
        </Panel>
      </div>

      <Pagination page={page} lastPage={lastPage} hrefForPage={(p) => hrefForBookingsPage(q, statuses, p)} />
    </Container>
  );
}

function hrefForBookingsPage(q: string, statuses: string[], page: number): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  statuses.forEach((s) => params.append("status", s));
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `${ROUTES.bookings}?${search}` : ROUTES.bookings;
}
