"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { BundleApiError, removeBundleFavourite, saveBundleFavourite } from "@/lib/api/bundles";
import type { BundleFavouriteMutation } from "@/lib/bundles";

export type BundleFavouriteActionResult =
  | { ok: true; favourite: BundleFavouriteMutation }
  | { ok: false; error: string };

export async function setBundleFavourite(bundleId: string, saved: boolean): Promise<BundleFavouriteActionResult> {
  try {
    const favourite = saved ? await saveBundleFavourite(bundleId) : await removeBundleFavourite(bundleId);
    revalidatePath(`/bundles/${bundleId}`);
    revalidatePath("/favourites");
    return { ok: true, favourite };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof BundleApiError) return { ok: false, error: error.message };
    return { ok: false, error: "Could not update favourites. Please try again." };
  }
}
