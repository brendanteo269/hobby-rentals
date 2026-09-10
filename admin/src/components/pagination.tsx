import Link from "next/link";
import type { Route } from "next";

/**
 * Page-through control, shared by every list this portal paginates.
 *
 * Takes a page-number-to-href function rather than a base route and query,
 * because each caller's URL carries different params (a search term, in the
 * user and wallet lists; nothing at all, on a wallet's own transaction
 * history) — building the href is the one part that has to stay with the
 * caller.
 */
export function Pagination({
  page,
  lastPage,
  hrefForPage,
}: {
  page: number;
  lastPage: number;
  hrefForPage: (page: number) => string;
}) {
  if (lastPage <= 1) return null;

  return (
    <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
      <PageLink href={hrefForPage(page - 1)} disabled={page <= 1}>
        ← Previous
      </PageLink>
      <span className="text-sm text-ink-soft">
        Page {page} of {lastPage}
      </span>
      <PageLink href={hrefForPage(page + 1)} disabled={page >= lastPage}>
        Next →
      </PageLink>
    </nav>
  );
}

/** A disabled control is rendered as text, so it cannot be tabbed to or followed. */
function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) return <span className="text-sm text-stone">{children}</span>;

  return (
    <Link href={href as Route} className="text-sm text-ink-soft transition-colors hover:text-ink">
      {children}
    </Link>
  );
}
