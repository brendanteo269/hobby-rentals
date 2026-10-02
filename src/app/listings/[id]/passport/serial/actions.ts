"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { confirmSerial, ListingApiError, publishIfComplete } from "@/lib/api/listings";
import { parseSerialClaim, SERIAL_INCOMPLETE } from "@/lib/listings";

/** For a listing created before serials were required. Publishes it if it's a draft with its baseline already on record. */
export async function saveSerial(
  listingId: string,
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const claim = parseSerialClaim(formData);
  if (!claim) return { error: SERIAL_INCOMPLETE };

  let draft: boolean;
  try {
    await confirmSerial(listingId, claim);
    draft = await publishIfComplete(listingId);
  } catch (caught) {
    if (caught instanceof ListingApiError) return { error: caught.message };
    throw caught;
  }

  revalidatePath("/listings/mine");
  revalidatePath(`/listings/${listingId}`);
  revalidatePath(`/listings/${listingId}/passport`);
  // Outside the try: redirect signals by throwing.
  redirect(draft ? `/listings/${listingId}/passport` : `/listings/${listingId}`);
}
