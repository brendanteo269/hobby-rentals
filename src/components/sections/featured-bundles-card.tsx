import { BundleCard } from "@/components/bundles/bundle-card";
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
  return <BundleCard bundle={bundle} className={className} />;
}
