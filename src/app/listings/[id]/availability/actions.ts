"use server";

import { revalidatePath } from "next/cache";
import { addListingBlackout, deleteListingBlackout, updateListingAvailability } from "@/lib/api/listings";
import { ListingApiError } from "@/lib/api/listings";

export async function saveListingAvailability(id: string, formData: FormData) {
  try {
    const custom = formData.get("has_custom") === "true";
    const days = formData.getAll("days").map((value) => Number(value));
    await updateListingAvailability(id, custom, custom ? days : null);
    revalidatePath(`/listings/${id}/availability`);
    return { saved: true };
  } catch (error) { return { error: error instanceof Error ? error.message : "Could not save availability." }; }
}

export async function addBlackout(id: string, formData: FormData) {
  try {
    await addListingBlackout(id, String(formData.get("start_date") ?? ""), String(formData.get("end_date") ?? ""), String(formData.get("reason") ?? ""));
    revalidatePath(`/listings/${id}/availability`); return {};
  } catch (error) {
    if (error instanceof ListingApiError && typeof error.message === "string") return { error: error.message };
    return { error: "Could not add blackout." };
  }
}

export async function removeBlackout(id: string, blackoutId: string) {
  await deleteListingBlackout(id, blackoutId);
  revalidatePath(`/listings/${id}/availability`);
}
