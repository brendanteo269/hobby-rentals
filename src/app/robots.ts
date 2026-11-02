import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";
import { PROTECTED_PREFIXES } from "@/lib/route-policy";

// Pages outside the sign-in wall that still have nothing for search: the
// sign-in flow itself, the API proxy routes and the admin area.
const NOT_FOR_SEARCH = [
  "/login", "/signup", "/forgot-password", "/reset-password", "/reset-requested", "/check-email",
  "/auth", "/api", "/admin",
];

/**
 * S5-02: /robots.txt. Crawlers may read the home page and the public /gear
 * pages; everything behind sign-in is blocked by reusing PROTECTED_PREFIXES,
 * so a page that gains a sign-in wall is kept out of search without a second edit.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/gear/"],
      disallow: [...PROTECTED_PREFIXES, ...NOT_FOR_SEARCH],
    },
    sitemap: new URL("/sitemap.xml", siteUrl()).toString(),
  };
}
