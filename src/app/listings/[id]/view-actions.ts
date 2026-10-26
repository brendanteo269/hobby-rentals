"use server";

import { recordListingView } from "@/lib/api/listings";

/** S4-14: best-effort, like the analytics bridge - a history hiccup must never affect the listing page. */
export async function emitListingView(listingId: string): Promise<void> {
  try { await recordListingView(listingId); } catch { /* deliberately silent */ }
}
