"use server";

import { BackendApiError } from "@/lib/api/client";
import { checkSearchGap } from "@/lib/api/search-gaps";
import type { SearchGapResult } from "@/lib/search-gaps";

/** S5-03: runs the check for one of the owner's listings. Reads only; the listing is never changed. */
export async function runSearchGapCheck(listingId: string): Promise<{ result: SearchGapResult } | { error: string }> {
  try {
    return { result: await checkSearchGap(listingId) };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
}
