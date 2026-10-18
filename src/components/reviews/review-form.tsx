"use client";
import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { submitRentalReview } from "@/app/reviews/actions";
import { Button, FormNotice } from "@/components/ui";
import { useToast } from "@/components/toast";

export function ReviewForm({ bookingId, bundleBookingId, role, party }: { bookingId?: string | null; bundleBookingId?: string | null; role: "OWNER" | "RENTER"; party: "owner" | "renter" }) {
  const [state, setState] = useState<{ error?: string; success?: boolean }>();
  const [pending, startTransition] = useTransition();
  const { show } = useToast();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await submitRentalReview(undefined, formData);
      setState(result);
      if (result?.success) show("Thanks for sharing your rating and review.");
    });
  }

  if (state?.success) return <FormNotice message={`Your review of the ${role === "OWNER" ? "owner" : "renter"} has been published.`} />;
  return <form action={submit} className="mt-6 space-y-5">
    <input type="hidden" name="booking_id" value={bookingId ?? ""} />
    <input type="hidden" name="bundle_booking_id" value={bundleBookingId ?? ""} />
    <p className="text-sm text-ink-soft">How was your experience with this {party}? Your review will be published on their public profile. Keep it honest, relevant and respectful.</p>
    <fieldset><legend className="text-sm font-medium text-ink">Your rating</legend><div className="mt-2 flex gap-1" role="radiogroup" aria-label="Your rating">{[1, 2, 3, 4, 5].map((value) => <label key={value} className="cursor-pointer"><input className="sr-only" type="radio" name="rating" value={value} checked={rating === value} onChange={() => setRating(value)} required /><Star aria-hidden="true" className={`size-9 transition-colors ${value <= rating ? "fill-accent text-accent" : "text-line"}`} /></label>)}</div></fieldset>
    <label className="block text-sm font-medium text-ink">Review<textarea name="body" required maxLength={1200} value={body} onChange={(event) => setBody(event.target.value)} className="mt-2 min-h-32 w-full border border-line bg-white p-3 text-sm text-ink" placeholder={`What was your experience with this ${party}?`} /></label>
    <p className={`-mt-3 text-xs ${wordCount > 100 ? "text-accent-dark" : "text-ink-soft"}`}>{wordCount} / 100 words{wordCount > 100 && " — shorten your review to publish it."}</p>
    {state?.error && <FormNotice message={state.error} />}
    <Button type="submit" disabled={pending || wordCount > 100}>{pending ? "Publishing…" : "Publish review"}</Button>
  </form>;
}
