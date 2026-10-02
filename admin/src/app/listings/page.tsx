import Link from "next/link";
import { requirePortalSession } from "@/lib/admin";
import { ROUTES } from "@/lib/routes";
import { formatDate, shortId } from "@/lib/format";
import { LISTINGS_LIMIT, searchListings } from "@/lib/passports";
import { Badge, Button, Container, EmptyState, Input, Panel } from "@/components/ui";

export const metadata = { title: "Listings — HobbyRentals Admin" };

/** Finds a listing to review its Product Passport (S2-24). */
export default async function ListingsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requirePortalSession();
  const { q = "" } = await searchParams;
  const { listings, error } = await searchListings(q);

  const description = error
    ? error
    : listings.length === 0
      ? "No listings match this search."
      : listings.length === LISTINGS_LIMIT
        ? `Showing the newest ${LISTINGS_LIMIT}. Narrow the search to see others.`
        : `${listings.length} listing${listings.length === 1 ? "" : "s"}${q ? " matching this search" : ""}.`;

  return (
    <Container className="py-12">
      <p className="eyebrow">Admin</p>
      <h1 className="display-caps mt-3 text-3xl">Listings</h1>

      {/* A plain GET form, like UserSearch: the query lives in the URL. */}
      <form method="get" role="search" className="mt-8 flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <label htmlFor="q" className="block text-sm font-medium">
            Find a listing
          </label>
          <Input id="q" name="q" type="search" defaultValue={q} placeholder="Listing name or ID" autoComplete="off" className="mt-2" />
        </div>
        <Button type="submit">Search</Button>
        {q && (
          <Link href={ROUTES.listings} className="px-1 pb-3 text-sm text-ink-soft underline underline-offset-4 hover:text-ink">
            Clear
          </Link>
        )}
      </form>

      <div className="mt-8">
        <Panel title="Listings" description={description}>
          <div className="-mx-6 -my-5">
            {listings.length === 0 ? (
              <EmptyState title="No matching listings" body="Search by listing name or ID. Partial names are fine." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-3xl border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line text-left">
                      <th scope="col" className="eyebrow px-6 py-3 font-normal">Listing</th>
                      <th scope="col" className="eyebrow px-6 py-3 font-normal">Status</th>
                      <th scope="col" className="eyebrow px-6 py-3 font-normal">Owner</th>
                      <th scope="col" className="eyebrow px-6 py-3 font-normal">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listings.map((listing) => (
                      <tr key={listing.id} className="border-b border-line last:border-0 hover:bg-sand">
                        <td className="px-6 py-4">
                          <Link href={ROUTES.listingPassport(listing.id)} className="block">
                            <span className="font-medium underline-offset-4 hover:underline">{listing.name}</span>
                            <span className="mt-0.5 block text-xs text-ink-soft">{shortId(listing.id)}</span>
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <Badge>{listing.status}</Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Link href={ROUTES.user(listing.owner_id)} className="underline-offset-4 hover:underline">
                            {shortId(listing.owner_id)}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-ink-soft">{formatDate(listing.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </Container>
  );
}
