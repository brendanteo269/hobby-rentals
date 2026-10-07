"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { ListingApiError, removeFavourite, saveFavourite } from "@/lib/api/listings";
import type { FavouriteMutation } from "@/lib/listings";

export type FavouriteActionResult =
  | { ok: true; favourite: FavouriteMutation }
  | { ok: false; error: string };

/**
 * The backend identifies the member from their session token. This action
 * returns failures as data so the optimistic client control can roll back
 * rather than tripping a route-level error boundary.
 */
export async function setFavourite(listingId: string, saved: boolean): Promise<FavouriteActionResult> {
  try {
    const favourite = saved ? await saveFavourite(listingId) : await removeFavourite(listingId);
    revalidatePath(`/listings/${listingId}`);
    revalidatePath("/browse");
    revalidatePath("/favourites");
    return { ok: true, favourite };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ListingApiError) return { ok: false, error: error.message };
    return { ok: false, error: "Could not update favourites. Please try again." };
  }
}
