"use client";
import { useActionState } from "react";
import { submitRentalReview } from "@/app/reviews/actions";
import { Button, FormNotice } from "@/components/ui";

export function ReviewForm({ bookingId, bundleBookingId, role, rentalName }: { bookingId?: string | null; bundleBookingId?: string | null; role: "OWNER" | "RENTER"; rentalName: string }) {
  const [state, action, pending] = useActionState(submitRentalReview, undefined);
  if (state?.success) return <FormNotice message={`Your review of the ${role === "OWNER" ? "owner" : "renter"} has been published.`} />;
  return <form action={action} className="mt-6 space-y-5">
    <input type="hidden" name="booking_id" value={bookingId ?? ""} />
    <input type="hidden" name="bundle_booking_id" value={bundleBookingId ?? ""} />
    <p className="text-sm text-ink-soft">Share feedback about {rentalName}. It will be published immediately.</p>
    <fieldset><legend className="text-sm font-medium text-ink">Your rating</legend><div className="mt-2 flex gap-2">{[1,2,3,4,5].map((rating) => <label key={rating} className="cursor-pointer"><input className="sr-only peer" type="radio" name="rating" value={rating} required /><span className="inline-flex size-9 items-center justify-center border border-line text-sm peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white">{rating}</span></label>)}</div></fieldset>
    <label className="block text-sm font-medium text-ink">Review<textarea name="body" required maxLength={1200} className="mt-2 min-h-32 w-full border border-line bg-white p-3 text-sm text-ink" placeholder="What was your experience?" /></label>
    {state?.error && <FormNotice message={state.error} />}
    <Button type="submit" disabled={pending}>{pending ? "Publishing…" : "Publish review"}</Button>
  </form>;
}
