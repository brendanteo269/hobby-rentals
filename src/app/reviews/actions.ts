"use server";
import { revalidatePath } from "next/cache";
import { RENTALS_PATH, RENTER_BOOKINGS_PATH } from "@/lib/routes";
import { BackendApiError } from "@/lib/api/client";
import { submitReview } from "@/lib/api/reviews";

export type SubmitReviewState = { error?: string; success?: boolean } | undefined;
export async function submitRentalReview(_previous: SubmitReviewState, form: FormData): Promise<SubmitReviewState> {
  const rating = Number(form.get("rating"));
  const body = String(form.get("body") ?? "").trim();
  const bookingId = String(form.get("booking_id") ?? "");
  const bundleBookingId = String(form.get("bundle_booking_id") ?? "");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Choose a rating from 1 to 5." };
  if (!body) return { error: "Write a short review." };
  if (body.split(/\s+/).length > 100) return { error: "Keep your review to 100 words." };
  try {
    await submitReview({ ...(bookingId ? { booking_id: bookingId } : { bundle_booking_id: bundleBookingId }), rating, body });
    revalidatePath("/profile"); revalidatePath(RENTALS_PATH); revalidatePath(RENTER_BOOKINGS_PATH); revalidatePath("/messages"); revalidatePath("/notifications");
    return { success: true };
  } catch (error) { return { error: error instanceof BackendApiError ? error.message : "Could not submit your review." }; }
}
