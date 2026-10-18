import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/ui";
import { ReviewForm } from "@/components/reviews/review-form";
import { getReviewEligibility } from "@/lib/api/reviews";

export default async function NewReviewPage({ searchParams }: { searchParams: Promise<{ booking?: string; bundle?: string }> }) {
  const { booking, bundle } = await searchParams;
  if (Boolean(booking) === Boolean(bundle)) notFound();
  const eligible = await getReviewEligibility();
  const review = eligible.find((item) => item.booking_id === booking || item.bundle_booking_id === bundle);
  if (!review) redirect("/profile?view=renter");
  return <Container className="max-w-2xl py-16"><p className="eyebrow">Completed rental</p><h1 className="heading mt-2 text-3xl">Rate the {review.reviewed_role === "OWNER" ? "owner" : "renter"}</h1><ReviewForm bookingId={review.booking_id} bundleBookingId={review.bundle_booking_id} role={review.reviewed_role} rentalName={review.rental_name} /></Container>;
}
