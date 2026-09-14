import { Container, ButtonLink, EmptyState } from "@/components/ui";
import { Pagination } from "@/components/pagination";
import { ListingFilters } from "@/components/browse/listing-filters";
import { ActiveFilters } from "@/components/browse/active-filters";
import { ListingCard } from "@/components/browse/listing-card";
import { browseListings, ListingApiError } from "@/lib/api/listings";
import {
  PAGE_SIZE,
  browsePageHref,
  hasActiveFilters,
  parseBrowseFilters,
  type BrowseFilters,
  type SearchParams,
} from "@/lib/browse-params";
import type { BrowseListingsResponse } from "@/lib/listings";

export const metadata = { title: "Browse gear — HobbyRentals" };

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const filters = parseBrowseFilters(await searchParams);
  const { data, error } = await loadListings(filters);

  const total = data?.total_count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Container className="py-16">
      <p className="eyebrow">Marketplace</p>
      <h1 className="display-caps mt-3 text-3xl">Browse gear</h1>

      <div className="mt-8">
        <ListingFilters filters={filters} />
      </div>

      <div className="mt-6">
        <ActiveFilters filters={filters} />
      </div>

      <p className="body-copy mt-6" aria-live="polite">
        {resultSummary(total, error)}
      </p>

      <div className="mt-6">
        {data && data.results.length > 0 ? (
          <ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {data.results.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </ul>
        ) : (
          <NoResults filters={filters} error={error} />
        )}
      </div>

      <Pagination
        page={filters.page}
        lastPage={lastPage}
        hrefForPage={(page) => browsePageHref(filters, page)}
      />
    </Container>
  );
}

/**
 * Fetches a page of listings, returning a backend failure rather than throwing.
 *
 * A filter combination the API rejects should leave the page standing with its
 * filters intact so the member can adjust one — an error boundary would take
 * the whole screen away instead. backendRequest still redirects an
 * unauthenticated caller to /login before this ever returns.
 */
async function loadListings(
  filters: BrowseFilters,
): Promise<{ data: BrowseListingsResponse | null; error: string | null }> {
  try {
    const data = await browseListings({
      q: filters.q || undefined,
      category: filters.category,
      condition: filters.condition,
      brand: filters.brand,
      location_area: filters.location_area,
      start_date: filters.start_date || undefined,
      end_date: filters.end_date || undefined,
      page: filters.page,
      page_size: PAGE_SIZE,
    });
    return { data, error: null };
  } catch (caught) {
    if (caught instanceof ListingApiError) return { data: null, error: caught.message };
    throw caught;
  }
}

function resultSummary(total: number, error: string | null): string {
  if (error) return error;
  if (total === 0) return "No listings match these filters.";
  return `${total} listing${total === 1 ? "" : "s"} available.`;
}

function NoResults({ filters, error }: { filters: BrowseFilters; error: string | null }) {
  if (error) {
    return (
      <EmptyState
        title="Listings could not be loaded"
        body="Something went wrong reaching the marketplace. Try again in a moment."
      />
    );
  }

  if (hasActiveFilters(filters)) {
    return (
      <EmptyState
        title="Nothing matches those filters"
        body="Try widening the dates, choosing another area, or searching for something broader."
        action={
          <ButtonLink href="/browse" variant="outline">
            Clear all filters
          </ButtonLink>
        }
      />
    );
  }

  return (
    <EmptyState
      title="No gear listed yet"
      body="Nothing is available to rent right now. Be the first to list something."
      action={<ButtonLink href="/listings/new">List your gear</ButtonLink>}
    />
  );
}
