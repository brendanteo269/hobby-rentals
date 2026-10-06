import Link from "next/link";
import { ButtonLink, Container, EmptyState, ImageSlot } from "@/components/ui";
import { Pagination } from "@/components/pagination";
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
import { formatMoney } from "@/lib/format";
import type { BrowseBundlesResponse, Bundle } from "@/lib/bundles";
import type { SearchParams } from "@/lib/browse-params";

export const metadata = { title: "Gear bundles — HobbyRentals" };

/**
 * S2-20: the published-bundle marketplace, searchable the same way /browse is.
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
    <Container className="py-16">
      <p className="eyebrow">Marketplace</p>
      <h1 className="heading mt-3 text-3xl">Gear bundles</h1>
      <p className="body-copy mt-3 max-w-2xl">
        Sets of gear an owner rents out together at a package rate. A bundle is only offered on
        dates every item in it is free at the same time.
      </p>

      <div className="mt-8">
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
      action={<ButtonLink href="/browse" variant="outline">Browse listings</ButtonLink>}
    />
  );
}

function BundleCard({ bundle }: { bundle: Bundle }) {
  const cover = bundle.items.find((item) => item.photo_urls.length > 0);

  return (
    <li className="card overflow-hidden">
      <Link href={`/bundles/${bundle.id}`} className="block">
        <ImageSlot label={bundle.name} src={cover?.photo_urls[0]} className="aspect-[4/3] w-full" />
        <div className="p-5">
          <p className="eyebrow">
            {bundle.items.length} {bundle.items.length === 1 ? "item" : "items"}
          </p>
          <h2 className="mt-1 text-base font-semibold uppercase tracking-wide">{bundle.name}</h2>
          <p className="body-copy mt-1 line-clamp-2">
            {bundle.items.map((item) => item.name).join(" · ")}
          </p>
          <p className="mt-3 text-sm">
            {bundle.price_per_day_cents !== null && `${formatMoney(bundle.price_per_day_cents)} / day`}
            {bundle.price_per_day_cents !== null && bundle.price_per_week_cents !== null && " · "}
            {bundle.price_per_week_cents !== null && `${formatMoney(bundle.price_per_week_cents)} / week`}
          </p>
        </div>
      </Link>
    </li>
  );
}
