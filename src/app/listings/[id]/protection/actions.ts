"use server";
import { revalidatePath } from "next/cache";
import { BackendApiError } from "@/lib/api/client";
import { purchaseHobbyShield } from "@/lib/api/owner-protection";

export async function buyHobbyShield(listingId: string, _previous: { error?: string; purchased?: boolean } | undefined, formData: FormData) {
  const idempotencyKey = String(formData.get("idempotency_key") ?? "").trim();
  if (!idempotencyKey) return { error: "Please try again." };
  try {
    await purchaseHobbyShield(listingId, idempotencyKey);
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
  revalidatePath(`/listings/${listingId}/protection`);
  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/listings/mine");
  revalidatePath("/profile");
  return { purchased: true };
}
