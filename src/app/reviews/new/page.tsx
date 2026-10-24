import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/ui";
import { ReviewForm } from "@/components/reviews/review-form";
import { getReviewEligibility } from "@/lib/api/reviews";
import { profilePath } from "@/lib/routes";

export default async function NewReviewPage({ searchParams }: { searchParams: Promise<{ booking?: string; bundle?: string }> }) {
  const { booking, bundle } = await searchParams;
  if (Boolean(booking) === Boolean(bundle)) notFound();
  const eligible = await getReviewEligibility();
  const review = eligible.find((item) => item.booking_id === booking || item.bundle_booking_id === bundle);
  if (!review) redirect(profilePath("ratings"));
  const party = review.reviewed_role === "OWNER" ? "owner" : "renter";
  return <Container className="max-w-2xl py-16"><p className="eyebrow">Completed rental</p><h1 className="heading mt-2 text-3xl">Rate your experience</h1><ReviewForm bookingId={review.booking_id} bundleBookingId={review.bundle_booking_id} role={review.reviewed_role} party={party} /></Container>;
}
