import { notFound } from "next/navigation";
import { OwnerPortal, requireOwner } from "@/components/owner-portal";
import { BookingRequestReview } from "@/components/bookings/booking-request-review";
import { getOwnerBundleRequest } from "@/lib/api/bookings";
import { BackendApiError } from "@/lib/api/client";

export const metadata = { title: "Bundle request — HobbyRentals" };

/** One bundle booking request, for the owner to decide whole. */
export default async function BundleRequestPage({ params }: { params: Promise<{ bundleBookingId: string }> }) {
  await requireOwner();
  const { bundleBookingId } = await params;
  let request;
  try {
    request = await getOwnerBundleRequest(bundleBookingId);
  } catch (error) {
    // Anyone else's request is a 404 too, so this reveals nothing about it.
    if (error instanceof BackendApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <OwnerPortal active="Bookings" title="Bundle request">
      <BookingRequestReview request={request} />
    </OwnerPortal>
  );
}
