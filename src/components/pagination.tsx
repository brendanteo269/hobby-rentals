import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";

type PaginationProps = {
  page: number;
  lastPage: number;
} & (
  | { hrefForPage: (page: number) => string; onPageChange?: undefined }
  | { onPageChange: (page: number) => void; hrefForPage?: undefined }
);

/**
 * Page-through control for any paginated list.
 *
 * A server-rendered list (browse) pages via `hrefForPage`, since its state
 * lives in the URL; a client-only list (the wallet's transaction table) has
 * nothing to link to and pages via `onPageChange` instead. Same control
 * either way — the caller just says how a page change happens.
 */
export function Pagination({ page, lastPage, hrefForPage, onPageChange }: PaginationProps) {
  if (lastPage <= 1) return null;

  return (
    <nav className="mt-10 flex items-center justify-between border-t border-line pt-6" aria-label="Pagination">
      <PageControl page={page - 1} disabled={page <= 1} hrefForPage={hrefForPage} onPageChange={onPageChange}>
        ← Previous
      </PageControl>
      <span className="text-sm text-ink-soft">
        Page {page} of {lastPage}
      </span>
      <PageControl page={page + 1} disabled={page >= lastPage} hrefForPage={hrefForPage} onPageChange={onPageChange}>
        Next →
      </PageControl>
    </nav>
  );
}

/** A disabled control renders as text, so it cannot be tabbed to or followed. */
function PageControl({
  page,
  disabled,
  hrefForPage,
  onPageChange,
  children,
}: {
  page: number;
  disabled: boolean;
  children: ReactNode;
} & Pick<PaginationProps, "hrefForPage" | "onPageChange">) {
  if (disabled) return <span className="text-sm text-ink-soft/40">{children}</span>;

  if (hrefForPage) {
    return (
      <Link href={hrefForPage(page) as Route} className="text-sm text-ink-soft transition-colors hover:text-ink">
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onPageChange?.(page)}
      className="text-sm text-ink-soft transition-colors hover:text-ink"
    >
      {children}
    </button>
  );
}
