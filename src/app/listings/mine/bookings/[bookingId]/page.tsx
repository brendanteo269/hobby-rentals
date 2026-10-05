import { notFound } from "next/navigation";
import { OwnerPortal, requireOwner } from "@/components/owner-portal";
import { BookingRequestReview } from "@/components/bookings/booking-request-review";
import { getOwnerBookingRequest } from "@/lib/api/bookings";
import { BackendApiError } from "@/lib/api/client";

export const metadata = { title: "Booking request — HobbyRentals" };

/** One single-listing booking request, for the owner to decide. */
export default async function BookingRequestPage({ params }: { params: Promise<{ bookingId: string }> }) {
  await requireOwner();
  const { bookingId } = await params;
  let request;
  try {
    request = await getOwnerBookingRequest(bookingId);
  } catch (error) {
    // Anyone else's request is a 404 too, so this reveals nothing about it.
    if (error instanceof BackendApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <OwnerPortal active="Bookings" title="Booking request">
      <BookingRequestReview request={request} />
    </OwnerPortal>
  );
}
