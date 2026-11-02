import "server-only";

import { cache } from "react";
import { apiBaseUrl } from "@/lib/env";
import type { PublicBundle, PublicListing, SitemapEntries } from "@/lib/gear";

/**
 * S5-01: the public API needs no session, so this skips backendRequest, which
 * sends anyone signed out to the login screen. null means not found: missing,
 * not live, or a malformed reference all look the same from outside.
 */
async function publicGet<T>(path: string): Promise<T | null> {
  const res = await fetch(`${apiBaseUrl()}${path}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Public API request failed (${res.status})`);
  return (await res.json()) as T;
}

// cache(): generateMetadata and the page both ask, and should cost one request.
export const getPublicListing = cache((ref: string) => publicGet<PublicListing>(`/public/listings/${encodeURIComponent(ref)}`));

export const getPublicBundle = cache((ref: string) => publicGet<PublicBundle>(`/public/bundles/${encodeURIComponent(ref)}`));

/** S5-02: every live listing and bundle, for /sitemap.xml. Throws if the API is down, so a broken sitemap is an error rather than an empty one. */
export async function getSitemapEntries(): Promise<SitemapEntries> {
  const entries = await publicGet<SitemapEntries>("/public/sitemap");
  if (!entries) throw new Error("Sitemap entries not found");
  return entries;
}
