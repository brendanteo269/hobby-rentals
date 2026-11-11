"use server";

import { revalidatePath } from "next/cache";
import { BackendApiError } from "@/lib/api/client";
import { createListingPromoCode, deleteListingPromoCode } from "@/lib/api/promo-codes";
import type { PromoCode } from "@/lib/promo-codes";
import type { CreateListingRequest } from "@/lib/listings";

export type PromoCodeResult = { error: string } | { code: PromoCode };

/**
 * S5-12 Scenario 1: add a code to a listing the caller owns.
 *
 * Takes the finished code rather than a FormData. The fields no longer live
 * in a form of their own - they sit inside the listing form, where a nested
 * one would be invalid HTML - so the component reads and checks them, and
 * this passes them on. The API validates all of it again regardless.
 */
export async function addPromoCode(
  listingId: string,
  code: NonNullable<CreateListingRequest["initial_promo_codes"]>[number],
): Promise<PromoCodeResult> {
  try {
    const created = await createListingPromoCode(listingId, code);
    revalidatePath(`/listings/${listingId}/edit`);
    return { code: created };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
}

/** S5-12 Scenario 3's "deleted by owner": it stops working for renters. */
export async function removePromoCode(listingId: string, codeId: string): Promise<{ error?: string }> {
  try {
    await deleteListingPromoCode(listingId, codeId);
    revalidatePath(`/listings/${listingId}/edit`);
    return {};
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
}
