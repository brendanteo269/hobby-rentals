import Link from "next/link";
import type { Route } from "next";
import { Container, ButtonLink, EmptyState } from "@/components/ui";
import { getMyRenterTrust } from "@/lib/api/verification";
import { Pagination } from "@/components/pagination";
import { MarketplaceHeader } from "@/components/browse/marketplace-header";
import { ListingFilters } from "@/components/browse/listing-filters";
import { ActiveFilters } from "@/components/browse/active-filters";
import { ListingCard } from "@/components/browse/listing-card";
import { ResultsSort } from "@/components/browse/results-sort";
import { browseListings, ListingApiError } from "@/lib/api/listings";
import {
  PAGE_SIZE,
  RELAX_FILTER_LABELS,
  browseHref,
  browsePageHref,
  hasActiveFilters,
  parseBrowseFilters,
  relatedCategoryHref,
  relaxedHref,
  type BrowseFilters,
  type SearchParams,
} from "@/lib/browse-params";
import type { BrowseListingsResponse, SearchSuggestions } from "@/lib/listings";
import { getCategoryDemandOverview } from "@/lib/api/analytics";
import { Camera, CloudOff, SearchX, Tag, Zap } from "lucide-react";
import { CATEGORY_LABELS } from "@/lib/listings";
import { SaveSearchButton } from "@/components/saved-searches/save-search-button";

export const metadata = { title: "Browse marketplace — HobbyRentals" };

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const filters = parseBrowseFilters(await searchParams);
  const { data, error } = await loadListings(filters);
  // S5-11: only when the filter is on, and only to explain an empty page -
  // the backend has already decided what this renter qualifies for.
  const instantBookEligible = filters.instant_book
    ? ((await getMyRenterTrust().catch(() => undefined))?.trusted ?? undefined)
    : undefined;
  const highDemandCategories = new Set((await getCategoryDemandOverview().catch(() => [])).filter((category) => category.is_high_demand).map((category) => category.category));

  const total = data?.total_count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const onlySearched = filters.q !== "" && !hasActiveFilters({ ...filters, q: "" });

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
        <p className="body-copy" aria-live="polite">{resultSummary(total, error, onlySearched, data?.search_mode)}</p>
      </div>

      {filters.photo && <PhotoBanner filters={filters} />}

      {/* S5-11: these listings are shown to every renter, so the one who has
          not earned the badge yet is told what booking one will actually do -
          before they pick a listing, not after they press the button. */}
      {filters.instant_book && instantBookEligible === false && (
        <p className="mt-4 flex items-start gap-2 bg-surface-muted px-4 py-3 text-sm text-ink-soft">
          <Zap className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            These listings confirm the booking request of Trusted Renters straight away. As you do not hold that badge yet, so
            yours will go to the owner as a request to review. The Trusted Renter badge comes with 3 completed
            rentals, 95% of them returned on time, and no more than one upheld damage claim.
          </span>
        </p>
      )}

      <div className="mt-6">
        {data && data.results.length > 0 ? (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {data.results.map((listing) => (
              <ListingCard key={listing.id} listing={listing} highDemand={highDemandCategories.has(listing.category)} />
            ))}
          </ul>
        ) : (
          <NoResults filters={filters} error={error} suggestions={data?.suggestions} />
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
      instant_book: filters.instant_book,
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

function resultSummary(
  total: number,
  error: string | null,
  onlySearched: boolean,
  searchMode: BrowseListingsResponse["search_mode"],
): string {
  if (error) return error;
  if (total === 0) return onlySearched ? "No listings match this search." : "No listings match these filters.";
  const count = `${total} listing${total === 1 ? "" : "s"}`;
  // Says how a query was read, so a match that shares no word with it makes sense.
  if (searchMode === "semantic") return `${count} matching what you described, best match first.`;
  if (searchMode === "keyword") return `${count} matching your words. Smart search is catching up, so try again shortly for matches by meaning.`;
  return `${count} available.`;
}

function NoResults({
  filters,
  error,
  suggestions,
}: {
  filters: BrowseFilters;
  error: string | null;
  suggestions?: SearchSuggestions;
}) {
  if (!error && filters.photo) return <NoPhotoMatch filters={filters} />;

  if (!error && filters.q && suggestions) {
    return <NothingRelevant filters={filters} suggestions={suggestions} />;
  }

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

/**
 * Scenario 4: a search that found nothing relevant. Listings that were not
 * close enough are never shown here; instead, each filter that would find
 * something if removed (with how many), and categories to browse instead.
 */
function NothingRelevant({ filters, suggestions }: { filters: BrowseFilters; suggestions: SearchSuggestions }) {
  const { relax_filters, related_categories } = suggestions;
  return (
    <div className="card px-6 py-14 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent">
        <SearchX className="size-6" aria-hidden="true" />
      </span>
      <p className="heading mt-5 text-lg">No gear matches that yet</p>
      <p className="body-copy mx-auto mt-2 max-w-md">
        Nothing listed is close enough to &ldquo;{filters.q}&rdquo;.
        {relax_filters.length > 0
          ? " Removing a filter would find some gear, or try a broader description."
          : " Try describing it another way, or browse a related category."}
      </p>

      {relax_filters.length > 0 && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {relax_filters.map(({ filter, result_count }) => (
            <ButtonLink key={filter} href={relaxedHref(filters, filter) as Route} variant="outline">
              {RELAX_FILTER_LABELS[filter]} · {result_count} result{result_count === 1 ? "" : "s"}
            </ButtonLink>
          ))}
        </div>
      )}

      {related_categories.length > 0 && (
        <div className="mt-6">
          <p className="text-sm text-ink-soft">Browse a related category</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {related_categories.map(({ category, label }) => (
              <Link
                key={category}
                href={relatedCategoryHref(category) as Route}
                className="rounded-full bg-surface-muted px-3 py-1 text-sm text-ink-soft transition-colors hover:bg-accent-soft hover:text-accent-dark"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * S6-03 Scenario 2: what the photo search read the photo as. Tapping it runs
 * the plain text search for that item, without the category it guessed.
 */
function PhotoBanner({ filters }: { filters: BrowseFilters }) {
  const category = filters.photo_category ? CATEGORY_LABELS[filters.photo_category] : null;
  const asText = browseHref({ ...filters, q: filters.photo, photo: "", photo_category: null, page: 1 });
  return (
    <p className="mt-4 flex flex-wrap items-center gap-2 bg-surface-muted px-4 py-3 text-sm text-ink-soft">
      <Camera className="size-4 shrink-0" aria-hidden="true" />
      <span>
        Looks like: <strong className="text-ink">{filters.photo}</strong>
        {category && <>, {category}</>}
      </span>
      <Link href={asText as Route} className="underline hover:text-ink">
        Search &ldquo;{filters.photo}&rdquo; as text instead
      </Link>
    </p>
  );
}

/** S6-03 Scenario 4: nothing close to the photo, so offer to ask owners for it. */
function NoPhotoMatch({ filters }: { filters: BrowseFilters }) {
  return (
    <EmptyState icon={Camera}
      title="No close matches"
      body={`Nobody has listed anything like this ${filters.photo} yet. Post a gear request and owners with one will be told.`}
      action={
        <div className="flex flex-wrap justify-center gap-3">
          <ButtonLink href={`/requests/new?title=${encodeURIComponent(filters.photo)}` as Route}>Post a gear request</ButtonLink>
          <ButtonLink href={browseHref({ ...filters, q: filters.photo, photo: "", photo_category: null, page: 1 }) as Route} variant="outline">
            Search as text
          </ButtonLink>
        </div>
      }
    />
  );
}
