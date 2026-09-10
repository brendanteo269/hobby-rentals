import Link from "next/link";
import { Button, Input } from "./ui";
import { ROUTES } from "@/lib/routes";

/**
 * Search box for the wallet list.
 *
 * Same plain-GET-form shape as UserSearch, for the same reason: the query
 * lives in the URL, so results can be linked to and survive a reload with no
 * client JavaScript.
 */
export function WalletSearch({ query }: { query: string }) {
  return (
    <form method="get" role="search" className="flex flex-wrap items-end gap-3">
      <div className="min-w-64 flex-1">
        <label htmlFor="q" className="block text-sm font-medium">
          Find a wallet
        </label>
        <Input
          id="q"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Name, email, account ID, or wallet ID"
          autoComplete="off"
          className="mt-2"
        />
      </div>
      <Button type="submit">Search</Button>
      {query && (
        <Link
          href={ROUTES.wallets}
          className="px-1 pb-3 text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
        >
          Clear
        </Link>
      )}
    </form>
  );
}
