"use server";
import { revalidatePath } from "next/cache";
import { ownerInsightsPath } from "@/lib/routes";
import { BackendApiError } from "@/lib/api/client";
import { purchaseListingPromotion } from "@/lib/api/listing-promotions";

export async function buyListingPromotion(listingId: string, _previous: { error?: string; purchased?: boolean } | undefined, formData: FormData) {
  const idempotencyKey = String(formData.get("idempotency_key") ?? "").trim();
  if (!idempotencyKey) return { error: "Please try again." };
  try {
    await purchaseListingPromotion(listingId, idempotencyKey);
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
  revalidatePath(`/listings/${listingId}/promotion`);
  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/listings/mine");
  revalidatePath("/browse");
  revalidatePath(ownerInsightsPath());
  return { purchased: true };
}
