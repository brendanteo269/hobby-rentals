import { notFound } from "next/navigation";
import { Container } from "@/components/ui";
import { ReturnInspection } from "@/components/bookings/return-inspection";
import { BackendApiError } from "@/lib/api/client";
import { getMyBookings } from "@/lib/api/bookings";
import { getReturnInspection } from "@/lib/api/returns";
import { canStartReturnInspection } from "@/lib/returns";

export const metadata = { title: "Return photos — HobbyRentals" };

export default async function ReturnPhotosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // The renter's own bookings only: an owner, or anyone else, gets a 404.
  const booking = (await getMyBookings()).find((candidate) => candidate.id === id);
  if (!booking) notFound();

  let inspection = null;
  try {
    inspection = await getReturnInspection(id);
  } catch (caught) {
    if (!(caught instanceof BackendApiError && caught.status === 404)) throw caught;
  }

  const completed = inspection?.status === "COMPLETED";
  if (!completed && !canStartReturnInspection(booking)) notFound();

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow">Returning · {booking.listing_name ?? "Your rental"}</p>
        <h1 className="heading mt-3 text-3xl">{completed ? "Return photos saved" : "Photograph the return"}</h1>
        <div className="mt-10">
          <ReturnInspection
            bookingId={id}
            listingName={booking.listing_name ?? null}
            initial={inspection}
            returnState={booking.return_state ?? null}
            rentalActive={booking.status === "ACTIVE"}
          />
        </div>
      </div>
    </Container>
  );
}
