import { ButtonLink, Container, EmptyState } from "@/components/ui";
import { Pagination } from "@/components/pagination";
import { MarketplaceHeader } from "@/components/browse/marketplace-header";
import { BundleFilters } from "@/components/bundles/bundle-filters";
import { ActiveBundleFilters } from "@/components/bundles/active-bundle-filters";
import { browseBundles, BundleApiError } from "@/lib/api/bundles";
import {
  BUNDLE_PAGE_SIZE,
  bundleBrowsePageHref,
  hasActiveBundleFilters,
  parseBundleFilters,
  type BundleBrowseFilters,
} from "@/lib/bundle-browse-params";
import type { BrowseBundlesResponse } from "@/lib/bundles";
import type { SearchParams } from "@/lib/browse-params";
import { BundleCard } from "@/components/bundles/bundle-card";

export const metadata = { title: "Bundles · Browse marketplace — HobbyRentals" };

/**
 * S2-20: the bundles side of the marketplace, searchable the same way the
 * items side (/browse) is and switched to with the toggle both share.
 *
 * A bundle whose component stopped being available is absent rather than
 * shown as unbookable (Scenario 6) - the backend never returns it - while
 * that component's own listing is unaffected and still on /browse.
 */
export default async function BundlesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = parseBundleFilters(await searchParams);
  const { data, error } = await loadBundles(filters);

  const total = data?.total_count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / BUNDLE_PAGE_SIZE));

  return (
    <Container className="pb-16 pt-10">
      <MarketplaceHeader active="bundles" filters={filters} activeCount={error ? null : total} />

      <div className="mt-5">
        <BundleFilters filters={filters} />
      </div>

      <div className="mt-6">
        <ActiveBundleFilters filters={filters} />
      </div>

      <p className="body-copy mt-6" aria-live="polite">
        {resultSummary(total, error)}
      </p>

      <div className="mt-6">
        {data && data.results.length > 0 ? (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.results.map((bundle) => (
              <BundleCard key={bundle.id} bundle={bundle} />
            ))}
          </ul>
        ) : (
          <NoResults filters={filters} error={error} />
        )}
      </div>

      <Pagination
        page={filters.page}
        lastPage={lastPage}
        hrefForPage={(page) => bundleBrowsePageHref(filters, page)}
      />
    </Container>
  );
}

/**
 * Fetches a page of bundles, returning a backend failure rather than throwing.
 *
 * A filter combination the API rejects should leave the page standing with
 * its filters intact so the member can adjust one - an error boundary would
 * take the whole screen away instead.
 */
async function loadBundles(
  filters: BundleBrowseFilters,
): Promise<{ data: BrowseBundlesResponse | null; error: string | null }> {
  try {
    const data = await browseBundles({
      q: filters.q || undefined,
      category: filters.category,
      location_area: filters.location_area,
      start_date: filters.start_date || undefined,
      end_date: filters.end_date || undefined,
      page: filters.page,
      page_size: BUNDLE_PAGE_SIZE,
    });
    return { data, error: null };
  } catch (caught) {
    if (caught instanceof BundleApiError) return { data: null, error: caught.message };
    throw caught;
  }
}

function resultSummary(total: number, error: string | null): string {
  if (error) return error;
  if (total === 0) return "No bundles match these filters.";
  return `${total} bundle${total === 1 ? "" : "s"} available.`;
}

function NoResults({ filters, error }: { filters: BundleBrowseFilters; error: string | null }) {
  if (error) {
    return (
      <EmptyState
        title="Bundles could not be loaded"
        body="Something went wrong reaching the marketplace. Try again in a moment."
      />
    );
  }

  if (hasActiveBundleFilters(filters)) {
    return (
      <EmptyState
        title="Nothing matches those filters"
        body="Try widening the dates, choosing another area, or searching for something broader."
        action={
          <ButtonLink href="/bundles" variant="outline">
            Clear all filters
          </ButtonLink>
        }
      />
    );
  }

  return (
    <EmptyState
      title="No bundles yet"
      body="No owner has published a gear bundle yet. Browse individual listings in the meantime."
      action={<ButtonLink href="/browse" variant="outline">Browse items</ButtonLink>}
    />
  );
}
