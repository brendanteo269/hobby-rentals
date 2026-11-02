import type { MetadataRoute } from "next";
import { getSitemapEntries } from "@/lib/api/public";
import { siteUrl } from "@/lib/env";
import { gearBundlePath, gearPath } from "@/lib/gear";

// Built on every request, not cached at build time: a listing that stops being
// live must drop out on the next request (S5-02 Scenario 2).
export const dynamic = "force-dynamic";

/**
 * S5-02: /sitemap.xml. The home page and every live listing and bundle, each
 * by the same absolute URL its page gives as canonical, dated by its last update.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { listings, bundles } = await getSitemapEntries();
  const absolute = (path: string) => new URL(path, siteUrl()).toString();
  return [
    { url: absolute("/"), changeFrequency: "daily", priority: 1 },
    ...listings.map((listing) => ({ url: absolute(gearPath(listing)), lastModified: listing.updated_at, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...bundles.map((bundle) => ({ url: absolute(gearBundlePath(bundle)), lastModified: bundle.updated_at, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
