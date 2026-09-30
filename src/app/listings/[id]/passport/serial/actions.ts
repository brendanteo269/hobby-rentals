"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { confirmSerial, ListingApiError } from "@/lib/api/listings";
import { parseSerialClaim, SERIAL_INCOMPLETE } from "@/lib/listings";

/** For a listing created before serials were required. */
export async function saveSerial(
  listingId: string,
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const claim = parseSerialClaim(formData);
  if (!claim) return { error: SERIAL_INCOMPLETE };

  try {
    await confirmSerial(listingId, claim);
  } catch (caught) {
    if (caught instanceof ListingApiError) return { error: caught.message };
    throw caught;
  }

  revalidatePath(`/listings/${listingId}/passport`);
  // Outside the try: redirect signals by throwing.
  redirect(`/listings/${listingId}/passport`);
}
