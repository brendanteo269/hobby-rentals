import { Container, ButtonLink, EmptyState } from "@/components/ui";
import { Pagination } from "@/components/pagination";
import { MarketplaceHeader } from "@/components/browse/marketplace-header";
import { ListingFilters } from "@/components/browse/listing-filters";
import { ActiveFilters } from "@/components/browse/active-filters";
import { ListingCard } from "@/components/browse/listing-card";
import { ResultsSort } from "@/components/browse/results-sort";
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
import { getCategoryDemandOverview } from "@/lib/api/analytics";
import { CloudOff, SearchX, Tag } from "lucide-react";
import { SaveSearchButton } from "@/components/saved-searches/save-search-button";

export const metadata = { title: "Browse marketplace — HobbyRentals" };

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const filters = parseBrowseFilters(await searchParams);
  const { data, error } = await loadListings(filters);
  const highDemandCategories = new Set((await getCategoryDemandOverview().catch(() => [])).filter((category) => category.is_high_demand).map((category) => category.category));

  const total = data?.total_count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Container className="pb-16 pt-10">
      <MarketplaceHeader active="items" filters={filters} activeCount={error ? null : total} />
      <div className="mt-5">
        {/* Keyed on the applied filters: its inputs are uncontrolled (defaultValue/defaultChecked), so
            without a remount, removing a filter chip would leave the old value in the form for the next Apply. */}
        <ListingFilters key={JSON.stringify(filters)} filters={filters} highDemandCategories={[...highDemandCategories]} />
      </div>

      <div className="mt-6">
        <ActiveFilters filters={filters} />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SaveSearchButton filters={filters} />
          <ResultsSort filters={filters} />
        </div>
        <p className="body-copy" aria-live="polite">{resultSummary(total, error)}</p>
      </div>

      <div className="mt-6">
        {data && data.results.length > 0 ? (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {data.results.map((listing) => (
              <ListingCard key={listing.id} listing={listing} highDemand={highDemandCategories.has(listing.category)} />
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
      verified_only: filters.verified,
      min_daily_price: filters.min_price || undefined,
      max_daily_price: filters.max_price || undefined,
      origin_lat: filters.origin_lat ?? undefined,
      origin_lng: filters.origin_lng ?? undefined,
      radius_km: filters.radius_km ?? undefined,
      sort: filters.sort,
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
      <EmptyState icon={CloudOff}
        title="Listings could not be loaded"
        body="Something went wrong reaching the marketplace. Try again in a moment."
      />
    );
  }

  if (hasActiveFilters(filters)) {
    return (
      <EmptyState icon={SearchX}
        title="Nothing matches those filters"
        body="Try widening the dates, choosing another area, or searching for something broader. You can also save this search and we’ll alert you when matching gear arrives."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <SaveSearchButton filters={filters} prominent />
            <ButtonLink href="/browse" variant="outline">Clear all filters</ButtonLink>
          </div>
        }
      />
    );
  }

  return (
    <EmptyState icon={Tag}
      title="No listings yet"
      body="Nothing is available to rent right now. Be the first to list something."
      action={<ButtonLink href="/listings/new">Create a listing</ButtonLink>}
    />
  );
}
