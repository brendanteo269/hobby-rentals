import type { Route } from "next";
import { redirect } from "next/navigation";
import { requirePortalSession } from "@/lib/admin";
import { searchListings, PAGE_SIZE } from "@/lib/listings";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROUTES } from "@/lib/routes";
import { Container, Panel } from "@/components/ui";
import { ListingSearch } from "@/components/listing-search";
import { ListingTable } from "@/components/listing-table";
import { Pagination } from "@/components/pagination";

export const metadata = { title: "Listings — HobbyRentals Admin" };

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; status?: string; page?: string }>;
}) {
  // The proxy already turned away anyone without the portal password.
  // Repeated here because a page that reads listing/owner data should not
  // depend on middleware having run - a matcher change is one edit away from
  // silently exposing it.
  await requirePortalSession();

  const { q = "", category = "", status = "", page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [{ listings, total, error }, { data: categoryRows }] = await Promise.all([
    searchListings(q, category, status, page),
    createAdminClient().from("listing_categories").select("slug,label").order("display_order"),
  ]);

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // A page past the end of the result set (a bookmarked or shared link whose
  // matches have since shrunk) would otherwise render as a false "no
  // listings match this search" - send it back to the real last page instead.
  if (page > lastPage) redirect(hrefForListingsPage(q, category, status, lastPage) as Route);

  const description = error
    ? error
    : total === 0
      ? "No listings match this search."
      : `${total} listing${total === 1 ? "" : "s"}${q || category || status ? " matching this search" : ""}.`;

  return (
    <Container className="py-12">
      <p className="eyebrow">Admin</p>
      <h1 className="display-caps mt-3 text-3xl">Listings</h1>

      <div className="mt-8">
        <ListingSearch query={q} category={category} status={status} categories={categoryRows ?? []} />
      </div>

      <div className="mt-8">
        <Panel title="Listings" description={description}>
          <div className="-mx-6 -my-5">
            <ListingTable listings={listings} />
          </div>
        </Panel>
      </div>

      <Pagination page={page} lastPage={lastPage} hrefForPage={(p) => hrefForListingsPage(q, category, status, p)} />
    </Container>
  );
}

function hrefForListingsPage(q: string, category: string, status: string, page: number): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  if (status) params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `${ROUTES.listings}?${search}` : ROUTES.listings;
}
