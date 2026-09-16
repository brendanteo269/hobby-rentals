import { notFound } from "next/navigation";
import { Container } from "@/components/ui";
import { ListingGallery } from "@/components/listings/listing-gallery";
import { RateLine } from "@/components/browse/listing-card";
import { getBookingAvailability, getListing } from "@/lib/api/listings";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/format";
import { CATEGORY_LABELS, CONDITION_LABELS, LOCATION_LABELS } from "@/lib/listings";
import { BookingRequestForm } from "@/components/bookings/booking-request-form";

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let listing;
  try {
    listing = await getListing(id);
  } catch {
    notFound();
  }
  const { data: { user } } = await (await createClient()).auth.getUser();
  const bookingAvailability =
    listing.status === "ACTIVE" && user && user.id !== listing.owner_id
      ? await getBookingAvailability(listing.id)
      : null;

  return (
    <Container className="py-16">
      <div className="grid gap-10 lg:grid-cols-2">
        <ListingGallery photoUrls={listing.photo_urls} name={listing.name} />

        <div>
          <p className="eyebrow">
            {CATEGORY_LABELS[listing.category]} · {LOCATION_LABELS[listing.location_area]}
          </p>
          <h1 className="heading mt-2 text-3xl">{listing.name}</h1>

          <div className="mt-4 border-t border-line pt-4">
            <RateLine listing={listing} />
            <p className="body-copy mt-1">{formatMoney(listing.deposit_cents)} deposit</p>
          </div>

          <p className="body-copy mt-6 whitespace-pre-line">{listing.description}</p>

          <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-6 text-sm">
            <div>
              <dt className="text-ink-soft">Brand</dt>
              <dd className="mt-0.5">{listing.brand}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Condition</dt>
              <dd className="mt-0.5">{CONDITION_LABELS[listing.condition]}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Available from</dt>
              <dd className="mt-0.5">{formatDate(listing.available_from)}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Available until</dt>
              <dd className="mt-0.5">{listing.available_until ? formatDate(listing.available_until) : "Indefinitely"}</dd>
            </div>
          </dl>

          {listing.status === "ACTIVE" && user && user.id !== listing.owner_id && (
            <BookingRequestForm
              listingId={listing.id}
              availableDates={bookingAvailability?.available_dates ?? []}
              minRentalDays={listing.min_rental_days}
              maxRentalDays={listing.max_rental_days}
            />
          )}
          {listing.status === "PENDING_REMOVAL" && user && user.id !== listing.owner_id && (
            <p className="mt-8 border-t border-line pt-6 text-sm text-ink-soft">
              This listing is being removed after an existing booking concludes. Your confirmed booking remains valid.
            </p>
          )}
          {listing.status !== "ACTIVE" && user && user.id === listing.owner_id && (
            <p className="mt-8 border-t border-line pt-6 text-sm text-ink-soft">
              This listing is {listing.status === "PENDING_REMOVAL" ? `scheduled for removal on ${formatDate(listing.scheduled_removal_at!)}` : listing.status.toLowerCase()}.
            </p>
          )}
        </div>
      </div>
    </Container>
  );
}
