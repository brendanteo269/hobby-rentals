"use server";

import { revalidatePath } from "next/cache";
import { ListingApiError, recordConditionUpdate, recordPurchaseProof, reportStolen } from "@/lib/api/listings";

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

type FormState = { error?: string; saved?: boolean } | undefined;

async function run(listingId: string, call: () => Promise<unknown>): Promise<FormState> {
  try {
    await call();
  } catch (caught) {
    if (caught instanceof ListingApiError) return { error: caught.message };
    throw caught;
  }
  revalidatePath(`/listings/${listingId}`);
  revalidatePath(`/listings/${listingId}/passport`);
  return { saved: true };
}

/** S2-36: adds a receipt photo to the passport. */
export async function savePurchaseProof(listingId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const photoKey = String(formData.get("photo_key") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!photoKey) return { error: "Add a photo of the receipt or invoice." };
  return run(listingId, () => recordPurchaseProof(listingId, { photo_key: photoKey, ...(note && { note }) }));
}

/** S2-37: reports the item stolen. The page then shows the stolen notice instead of this form. */
export async function submitStolenReport(listingId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const note = String(formData.get("note") ?? "").trim();
  if (!note) return { error: "Say when and where it was stolen." };
  return run(listingId, () => reportStolen(listingId, note));
}
