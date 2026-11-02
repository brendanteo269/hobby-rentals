import "server-only";

import { cache } from "react";
import type { PublicBundle, PublicListing } from "@/lib/gear";

/**
 * S5-01: the public API needs no session, so this skips backendRequest, which
 * sends anyone signed out to the login screen. null means not found: missing,
 * not live, or a malformed reference all look the same from outside.
 */
async function publicGet<T>(path: string): Promise<T | null> {
  const apiBase = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");
  const res = await fetch(`${apiBase}${path}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Public API request failed (${res.status})`);
  return (await res.json()) as T;
}

// cache(): generateMetadata and the page both ask, and should cost one request.
export const getPublicListing = cache((ref: string) => publicGet<PublicListing>(`/public/listings/${encodeURIComponent(ref)}`));

export const getPublicBundle = cache((ref: string) => publicGet<PublicBundle>(`/public/bundles/${encodeURIComponent(ref)}`));
