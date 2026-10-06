import Link from "next/link";
import { Button, Input, Select } from "./ui";
import { ROUTES } from "@/lib/routes";
import { LISTING_STATUSES, LISTING_STATUS_LABELS, type CategoryOption } from "@/lib/listings";

/**
 * Search box for the listing list.
 *
 * A plain GET form, like UserSearch: the query and filters live in the URL,
 * so results can be linked to and survive a reload with no client
 * JavaScript. The page parameter is intentionally absent, so a new search or
 * filter change starts at the first page rather than page four of the
 * previous one.
 *
 * Status is a set of checkboxes rather than a single-select dropdown - an
 * admin investigating, say, an owner's account reasonably wants "draft and
 * published" at once, not one status at a time.
 */
export function ListingSearch({
  query,
  category,
  statuses,
  hasExplicitStatus,
  categories,
}: {
  query: string;
  category: string;
  /** The resolved filter - defaults to Published when nothing was chosen, so the boxes reflect what's actually applied. */
  statuses: string[];
  /** True only when the URL itself names a status - distinguishes "defaulted to Published" from "explicitly chose just Published", so Clear only appears when there's something to clear. */
  hasExplicitStatus: boolean;
  categories: CategoryOption[];
}) {
  const hasFilters = Boolean(query || category || hasExplicitStatus);

  return (
    <form method="get" role="search" className="flex flex-wrap items-end gap-6">
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

      <fieldset>
        <legend className="block text-sm font-medium">Status</legend>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
          {LISTING_STATUSES.map((s) => (
            <label key={s} className="flex items-center gap-1.5 text-sm whitespace-nowrap">
              <input type="checkbox" name="status" value={s} defaultChecked={statuses.includes(s)} className="accent-ink" />
              {LISTING_STATUS_LABELS[s]}
            </label>
          ))}
        </div>
      </fieldset>

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
