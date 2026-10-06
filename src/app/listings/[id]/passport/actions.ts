"use server";

import { revalidatePath } from "next/cache";
import { ListingApiError, recordConditionUpdate } from "@/lib/api/listings";

/** S2-31: appends a condition update. Stays on the passport page, which shows it at the top of the history. */
export async function saveConditionUpdate(
  listingId: string,
  _prev: { error?: string; saved?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  let photoKeys: string[];
  try {
    photoKeys = JSON.parse(String(formData.get("photo_keys") ?? "[]"));
  } catch {
    photoKeys = [];
  }
  const note = String(formData.get("note") ?? "").trim();
  if (photoKeys.length === 0 || !note) return { error: "Add at least one photo and a note describing what changed." };

  try {
    await recordConditionUpdate(listingId, { photo_keys: photoKeys, note });
  } catch (caught) {
    if (caught instanceof ListingApiError) return { error: caught.message };
    throw caught;
  }
  revalidatePath(`/listings/${listingId}`);
  revalidatePath(`/listings/${listingId}/passport`);
  return { saved: true };
}
