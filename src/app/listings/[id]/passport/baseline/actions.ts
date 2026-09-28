"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getListing, ListingApiError, publishListing, recordBaseline } from "@/lib/api/listings";
import { BASELINE_INCOMPLETE, parseBaselinePhotos } from "@/lib/listings";

/**
 * S2-04: records the baseline, then publishes if the listing is still a
 * draft. A listing that went live before passports existed is only given its
 * baseline - it is already public.
 */
export async function saveBaselineAndPublish(
  listingId: string,
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const photos = parseBaselinePhotos(formData);
  if (!photos) return { error: BASELINE_INCOMPLETE };

  try {
    await recordBaseline(listingId, photos);
    const listing = await getListing(listingId);
    if (listing.status === "DRAFT") await publishListing(listingId);
  } catch (caught) {
    if (caught instanceof ListingApiError) return { error: caught.message };
    throw caught;
  }

  revalidatePath("/listings/mine");
  revalidatePath(`/listings/${listingId}`);
  // Outside the try: redirect signals by throwing.
  redirect(`/listings/${listingId}`);
}
