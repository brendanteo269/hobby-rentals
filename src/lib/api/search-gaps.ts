import "server-only";

import { backendRequest } from "@/lib/api/client";
import type { SearchGapResult, SearchVisibilityRow } from "@/lib/search-gaps";

export function checkSearchGap(listingId: string) {
  return backendRequest<SearchGapResult>(`/search-gaps/listings/${encodeURIComponent(listingId)}`, { method: "POST" });
}

export function getSearchVisibility() {
  return backendRequest<SearchVisibilityRow[]>("/search-gaps/mine");
}
