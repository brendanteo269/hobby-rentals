"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ListingApiError, publishIfComplete, recordBaseline } from "@/lib/api/listings";
import { BASELINE_INCOMPLETE, parseBaselinePhotos } from "@/lib/listings";

/**
 * S2-04: records the baseline, then publishes the draft if its serial is
 * already verified. A draft still missing its serial goes back to its
 * passport page, which shows what's left.
 */
export async function saveBaselineAndPublish(
  listingId: string,
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const photos = parseBaselinePhotos(formData);
  if (!photos) return { error: BASELINE_INCOMPLETE };

  let draft: boolean;
  try {
    await recordBaseline(listingId, photos);
    draft = await publishIfComplete(listingId);
  } catch (caught) {
    if (caught instanceof ListingApiError) return { error: caught.message };
    throw caught;
  }

  revalidatePath("/listings/mine");
  revalidatePath(`/listings/${listingId}`);
  // Outside the try: redirect signals by throwing.
  redirect(draft ? `/listings/${listingId}/passport` : `/listings/${listingId}`);
}
