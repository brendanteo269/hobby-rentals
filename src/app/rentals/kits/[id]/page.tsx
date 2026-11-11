import { notFound } from "next/navigation";
import { RenterPortal, requireRenter } from "@/components/renter-portal";
import { KitDetail } from "@/components/bundles/kit-detail";
import { getKit, KitApiError } from "@/lib/api/booking-groups";
import { getMyBookings } from "@/lib/api/bookings";
import { getReviewEligibility } from "@/lib/api/reviews";
import { getMyGuideIndex } from "@/lib/api/guides";

export const metadata = { title: "Bundle request — HobbyRentals" };

/** S5-09 Scenario 4: one place to follow a cross-owner bundle, every owner's item and its status. */
export default async function KitPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRenter();
  const { id } = await params;
  const kit = await getKit(id).catch((error) => {
    if (error instanceof KitApiError && error.status === 404) notFound();
    throw error;
  });
  // Once an owner has accepted, an item is shown as the booking it is, with the
  // same actions it has anywhere (cancel, meetup, pickup, return, claims).
  const [bookings, reviewEligibility, guides] = await Promise.all([
    getMyBookings(),
    getReviewEligibility().catch(() => []),
    getMyGuideIndex().catch(() => []),
  ]);
  const accepted = bookings.filter(
    (booking) => booking.booking_group_id === kit.id && ["CONFIRMED", "ACTIVE", "COMPLETED"].includes(booking.status),
  );
  return (
    <RenterPortal active="Bookings" title="Bookings">
      <KitDetail kit={kit} acceptedBookings={accepted} reviewEligibility={reviewEligibility} guides={guides} />
    </RenterPortal>
  );
}
