import { notFound } from "next/navigation";
import { OwnerPortal, requireOwner } from "@/components/owner-portal";
import { ConfirmHandoverButton } from "@/components/bookings/confirm-handover-button";
import { BackendApiError } from "@/lib/api/client";
import { getOwnerBookings } from "@/lib/api/bookings";
import { getReturnInspection } from "@/lib/api/returns";
import { canConfirmHandover, handoverStatusLine } from "@/lib/handover";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Pickup photos — HobbyRentals" };

/**
 * S3-02: the renter's pickup photos, read-only, for the owner to check before
 * they confirm the handover.
 */
export default async function OwnerPickupPhotosPage({ params }: { params: Promise<{ bookingId: string }> }) {
  await requireOwner();
  const { bookingId } = await params;
  // The owner's own bookings only: anyone else, or no photos yet, is a 404.
  const booking = (await getOwnerBookings()).find((candidate) => candidate.id === bookingId);
  if (!booking) notFound();
  let inspection;
  try {
    inspection = await getReturnInspection(bookingId, "pickup");
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 404) notFound();
    throw error;
  }
  if (inspection.status !== "COMPLETED") notFound();

  const statusLine = booking.handover_state ? handoverStatusLine(booking.handover_state, "owner", booking.start_date) : null;

  return (
    <OwnerPortal active="Bookings" title={`Pickup photos · ${booking.listing_name ?? "Your item"}`}>
      <p className="body-copy">
        Taken by the renter{inspection.completed_at ? ` on ${formatDateTime(inspection.completed_at)}` : ""}. They are the
        record of the item&apos;s condition when it left you.
      </p>
      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {inspection.angles.map((angle) => (
          <li key={angle.angle}>
            <p className="text-sm font-medium">{angle.label}</p>
            {angle.accepted_photo && (
              // eslint-disable-next-line @next/next/no-img-element -- a short-lived presigned URL
              <img
                src={angle.accepted_photo.photo_url}
                alt={`${angle.label} pickup photo`}
                className="mt-2 aspect-square w-full rounded-xl border border-line object-cover"
              />
            )}
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-col items-start gap-2">
        {statusLine && <p className="body-copy">{statusLine}</p>}
        {canConfirmHandover(booking, "owner") && <ConfirmHandoverButton bookingId={booking.id} />}
      </div>
    </OwnerPortal>
  );
}
