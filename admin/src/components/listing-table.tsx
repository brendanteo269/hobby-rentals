import Link from "next/link";
import { Badge, EmptyState } from "./ui";
import { ROUTES } from "@/lib/routes";
import { formatDate, shortId } from "@/lib/format";
import { listingStatusLabel, listingStatusTone, type AdminListingSummary, type CategoryOption } from "@/lib/listings";

/**
 * Search results.
 *
 * Every row links to the listing's own detail page rather than expanding in
 * place - same reasoning as UserTable: the detail is where an administrator
 * actually investigates something, not a list that has scrolled.
 */
export function ListingTable({
  listings,
  categories,
}: {
  listings: AdminListingSummary[];
  /** Slug -> display label, so the Category column reads "Photography & video" rather than a raw enum slug. */
  categories: CategoryOption[];
}) {
  const categoryLabel = (slug: string) => categories.find((c) => c.slug === slug)?.label ?? slug;
  if (listings.length === 0) {
    return (
      <EmptyState
        title="No matching listings"
        body="Search by listing name, listing ID, owner name, or owner email. Partial matches are fine."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-3xl border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            <th scope="col" className="eyebrow px-6 py-3 font-normal">Listing</th>
            <th scope="col" className="eyebrow px-6 py-3 font-normal">Status</th>
            <th scope="col" className="eyebrow px-6 py-3 font-normal">Owner</th>
            <th scope="col" className="eyebrow px-6 py-3 font-normal">Category</th>
            <th scope="col" className="eyebrow px-6 py-3 font-normal">Created</th>
          </tr>
        </thead>
        <tbody>
          {listings.map((listing) => (
            <tr key={listing.id} className="border-b border-line last:border-0 hover:bg-sand">
              <td className="px-6 py-4">
                <Link href={ROUTES.listing(listing.id)} className="block">
                  <span className="font-medium underline-offset-4 hover:underline">{listing.name}</span>
                  <span className="mt-0.5 block text-xs text-ink-soft">{shortId(listing.id)}</span>
                </Link>
              </td>
              <td className="px-6 py-4">
                <Badge tone={listingStatusTone(listing.status)}>{listingStatusLabel(listing.status)}</Badge>
              </td>
              <td className="px-6 py-4">
                <Link href={ROUTES.user(listing.owner_id)} className="block underline-offset-4 hover:underline">
                  <span>{listing.owner_display_name ?? "No name"}</span>
                  <span className="mt-0.5 block text-xs text-ink-soft">{listing.owner_email ?? "No email"}</span>
                </Link>
              </td>
              <td className="px-6 py-4">
                <Badge>{categoryLabel(listing.category)}</Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-ink-soft">{formatDate(listing.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
