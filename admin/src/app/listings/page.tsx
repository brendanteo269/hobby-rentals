import type { Route } from "next";
import { redirect } from "next/navigation";
import { requirePortalSession } from "@/lib/admin";
import { getCategoryOptions, searchListings, PAGE_SIZE } from "@/lib/listings";
import { ROUTES } from "@/lib/routes";
import { Container, Panel } from "@/components/ui";
import { ListingSearch } from "@/components/listing-search";
import { ListingTable } from "@/components/listing-table";
import { Pagination } from "@/components/pagination";

export const metadata = { title: "Listings — HobbyRentals Admin" };

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string | string[]; status?: string | string[]; page?: string }>;
}) {
  // The proxy already turned away anyone without the portal password.
  // Repeated here because a page that reads listing/owner data should not
  // depend on middleware having run - a matcher change is one edit away from
  // silently exposing it.
  await requirePortalSession();

  const { q = "", category, status, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  // Empty means "any" for both - no status/category filter leaves every
  // listing (any status, any category) in the result set.
  const categories = Array.isArray(category) ? category : category ? [category] : [];
  const statuses = Array.isArray(status) ? status : status ? [status] : [];

  const [{ listings, total, error }, categoryOptions] = await Promise.all([
    searchListings(q, categories, statuses, page),
    getCategoryOptions(),
  ]);

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // A page past the end of the result set (a bookmarked or shared link whose
  // matches have since shrunk) would otherwise render as a false "no
  // listings match this search" - send it back to the real last page instead.
  if (page > lastPage) redirect(hrefForListingsPage(q, categories, statuses, lastPage) as Route);

  const description = error
    ? error
    : total === 0
      ? "No listings match this search."
      : `${total} listing${total === 1 ? "" : "s"}${q || categories.length > 0 || statuses.length > 0 ? " matching this search" : ""}.`;

  return (
    <Container className="py-12">
      <p className="eyebrow">Admin</p>
      <h1 className="display-caps mt-3 text-3xl">Listings</h1>

      <div className="mt-8">
        <ListingSearch query={q} categories={categories} statuses={statuses} categoryOptions={categoryOptions} />
      </div>

      <div className="mt-8">
        <Panel title="Listings" description={description}>
          <div className="-mx-6 -my-5">
            <ListingTable listings={listings} categories={categoryOptions} />
          </div>
        </Panel>
      </div>

      <Pagination
        page={page}
        lastPage={lastPage}
        hrefForPage={(p) => hrefForListingsPage(q, categories, statuses, p)}
      />
    </Container>
  );
}

function hrefForListingsPage(q: string, categories: string[], statuses: string[], page: number): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  categories.forEach((c) => params.append("category", c));
  statuses.forEach((s) => params.append("status", s));
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `${ROUTES.listings}?${search}` : ROUTES.listings;
}
