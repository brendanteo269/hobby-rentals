import Link from "next/link";
import { Button, Input, Select } from "./ui";
import { ROUTES } from "@/lib/routes";
import { LISTING_STATUSES, LISTING_STATUS_LABELS } from "@/lib/listings";

export type ListingCategoryOption = { slug: string; label: string };

/**
 * Search box for the listing list.
 *
 * A plain GET form, like UserSearch: the query and filters live in the URL,
 * so results can be linked to and survive a reload with no client
 * JavaScript. The page parameter is intentionally absent, so a new search or
 * filter change starts at the first page rather than page four of the
 * previous one.
 */
export function ListingSearch({
  query,
  category,
  status,
  categories,
}: {
  query: string;
  category: string;
  status: string;
  categories: ListingCategoryOption[];
}) {
  const hasFilters = Boolean(query || category || status);

  return (
    <form method="get" role="search" className="flex flex-wrap items-end gap-3">
      <div className="min-w-64 flex-1">
        <label htmlFor="q" className="block text-sm font-medium">
          Find a listing
        </label>
        <Input
          id="q"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Name, listing ID, owner name, or owner email"
          autoComplete="off"
          className="mt-2"
        />
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium">
          Category
        </label>
        <Select id="category" name="category" defaultValue={category} className="mt-2">
          <option value="">Any category</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium">
          Status
        </label>
        <Select id="status" name="status" defaultValue={status} className="mt-2">
          <option value="">Any status</option>
          {LISTING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LISTING_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>

      <Button type="submit">Search</Button>
      {hasFilters && (
        <Link
          href={ROUTES.listings}
          className="px-1 pb-3 text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
        >
          Clear
        </Link>
      )}
    </form>
  );
}
