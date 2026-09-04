import Link from "next/link";
import { Button, Input } from "./ui";

/**
 * Search box for the user list.
 *
 * A plain GET form, so the query lives in the URL: results can be linked to,
 * survive a reload, and come back from the browser's history without a
 * refetch. That also means the page needs no client JavaScript to be usable.
 *
 * The page parameter is intentionally absent, so a new search starts at the
 * first page rather than page four of the previous one.
 */
export function UserSearch({ query }: { query: string }) {
  return (
    <form method="get" role="search" className="flex flex-wrap items-end gap-3">
      <div className="min-w-64 flex-1">
        <label htmlFor="q" className="block text-sm font-medium">
          Find an account
        </label>
        <Input
          id="q"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Name, email address, or account ID"
          autoComplete="off"
          className="mt-2"
        />
      </div>
      <Button type="submit">Search</Button>
      {query && (
        <Link
          href="/users"
          className="px-1 pb-3 text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
        >
          Clear
        </Link>
      )}
    </form>
  );
}
