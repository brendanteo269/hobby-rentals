import Link from "next/link";
import type { Route } from "next";
import { Package } from "lucide-react";
import { formatMoney } from "@/lib/format";
import type { GearCard } from "@/lib/forum";

/** S6-11 Scenario 3: the listing or bundle a post links to. */
export function GearCardLink({ gear }: { gear: GearCard }) {
  return (
    <Link href={gear.href as Route} className="flex max-w-md items-center gap-3 rounded-xl border border-line bg-white p-3 transition-colors hover:border-ink-soft">
      {gear.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- small thumbnail from the listing bucket
        <img src={gear.photo_url} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
      ) : (
        <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-ink-soft">
          <Package className="size-5" aria-hidden="true" />
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-xs uppercase tracking-wide text-ink-soft">{gear.kind === "BUNDLE" ? "Bundle" : "Listing"}</span>
        <span className="block truncate text-sm font-medium text-ink">{gear.name}</span>
        {gear.price_per_day_cents !== null && <span className="block text-xs text-ink-soft">{formatMoney(gear.price_per_day_cents)} / day</span>}
      </span>
    </Link>
  );
}
