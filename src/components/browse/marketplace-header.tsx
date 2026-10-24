import Link from "next/link";
import type { Route } from "next";
import { unstable_rethrow } from "next/navigation";
import { Layers, Tag, type LucideIcon } from "lucide-react";
import { browseListings } from "@/lib/api/listings";
import { browseBundles } from "@/lib/api/bundles";
import { marketplaceHref, sharedFilters, type MarketplaceKind, type SharedMarketplaceFilters } from "@/lib/marketplace";

const SIDES: { kind: MarketplaceKind; label: string; icon: LucideIcon; title: string }[] = [
  { kind: "items", label: "Items", icon: Tag, title: "Single pieces of gear, each rented on its own" },
  { kind: "bundles", label: "Bundles", icon: Layers, title: "Sets of gear an owner rents out together at a package rate" },
];

/**
 * How many results the other side has for the same search, so a member
 * browsing items learns there are bundles too. Null when it cannot be had:
 * the count is a hint, and a failure must cost the number, not the page.
 */
async function countOtherSide(kind: MarketplaceKind, filters: SharedMarketplaceFilters): Promise<number | null> {
  const shared = sharedFilters(filters);
  const params = {
    q: shared.q || undefined,
    category: shared.category,
    location_area: shared.location_area,
    start_date: shared.start_date || undefined,
    end_date: shared.end_date || undefined,
    page_size: 1,
  };
  try {
    const response = kind === "bundles" ? await browseBundles(params) : await browseListings(params);
    return response.total_count;
  } catch (error) {
    // A redirect (the session ended) is Next's control flow, not a failure.
    unstable_rethrow(error);
    return null;
  }
}

/**
 * The top of the marketplace: its Items / Bundles toggle, shared by /browse
 * and /bundles so the two read as one catalogue. Each side keeps its own
 * filters below; the toggle carries over the ones they share.
 *
 * No visible title: the header's Marketplace link is already underlined, and
 * a heading repeating it pushed the search down for nothing. The h1 stays for
 * screen readers and the document outline.
 */
export async function MarketplaceHeader({
  active,
  filters,
  activeCount,
}: {
  active: MarketplaceKind;
  filters: SharedMarketplaceFilters;
  /** The active side's total, which its page already has. Null when its search failed. */
  activeCount: number | null;
}) {
  const other: MarketplaceKind = active === "items" ? "bundles" : "items";
  const otherCount = await countOtherSide(other, filters);
  const countOf = (kind: MarketplaceKind) => (kind === active ? activeCount : otherCount);

  return (
    <div>
      <h1 className="sr-only">Browse marketplace</h1>
      <nav aria-label="Show items or bundles" className="inline-flex rounded-full bg-surface-muted p-1">
        {SIDES.map(({ kind, label, icon: Icon, title }) => {
          const isActive = kind === active;
          return (
            <Link
              key={kind}
              href={marketplaceHref(kind, filters) as Route}
              aria-current={isActive ? "page" : undefined}
              title={title}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                isActive ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink"
              }`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
              {countOf(kind) !== null && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${isActive ? "bg-ink text-white" : "bg-white text-ink-soft"}`}
                >
                  {countOf(kind)}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
