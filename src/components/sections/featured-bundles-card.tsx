import Link from "next/link";
import type { Route } from "next";
import { Badge, ImageSlot } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/listings";
import type { FeaturedBundleCard as Card } from "@/lib/bundles";

/**
 * S2-30: one bundle on the landing page, built to sit beside ListingCard in
 * the same rail - same photo-over-detail shape, so the two read as one
 * marketplace rather than two features.
 *
 * The link goes straight to the bundle's page. That route is protected, so a
 * logged-out visitor is bounced through login and returned here afterwards by
 * the middleware - which is Scenario 2 without this component knowing anything
 * about authentication.
 */
export function FeaturedBundleCard({ bundle, className = "" }: { bundle: Card; className?: string }) {
  const categories = [...new Set(bundle.items.map((item) => item.category))];

  return (
    <li className={`card overflow-hidden ${className}`}>
      <Link href={`/bundles/${bundle.id}` as Route} className="block">
        <div className="relative">
          <ImageSlot
            label={bundle.name}
            src={bundle.primary_photo_url ?? undefined}
            className="aspect-[4/3] w-full"
          />
          <span className="absolute left-3 top-3">
            <Badge variant="dark">
              {bundle.item_count} items
            </Badge>
          </span>
        </div>

        <div className="p-5">
          <p className="eyebrow line-clamp-1">
            {categories.map((category) => CATEGORY_LABELS[category] ?? category).join(" · ")}
          </p>
          <h3 className="mt-1 text-base font-semibold uppercase tracking-wide line-clamp-1">
            {bundle.name}
          </h3>

          {/* The components, which are the whole point of a bundle: a renter
              is deciding whether this set saves them piecing one together. */}
          <p className="body-copy mt-1 line-clamp-2">
            {bundle.items.map((item) => item.name).join(" · ")}
          </p>

          <p className="mt-3 text-sm">
            {bundle.price_per_day_cents !== null && `${formatMoney(bundle.price_per_day_cents)} / day`}
            {bundle.price_per_day_cents !== null && bundle.price_per_week_cents !== null && " · "}
            {bundle.price_per_week_cents !== null && `${formatMoney(bundle.price_per_week_cents)} / week`}
          </p>
        </div>
      </Link>
    </li>
  );
}
