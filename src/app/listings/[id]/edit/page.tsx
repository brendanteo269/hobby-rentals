import { notFound } from "next/navigation";
import { Container } from "@/components/ui";
import { ListingForm } from "@/components/listings/listing-form";
import { updateListing } from "@/app/listings/actions";
import { getListingFormContext } from "@/app/listings/form-context";
import { getListing, getListingAvailability } from "@/lib/api/listings";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Edit listing — HobbyRentals" };

/**
 * Owner's edit page for one listing. Same form as create, started
 * from the stored values.
 *
 * 404 rather than 403 for anyone but the owner, matching the API: an ACTIVE
 * listing is readable by everyone, so without this check a renter could open
 * an edit form for gear that is not theirs. Nothing would save - the API
 * checks ownership on write - but a form that cannot succeed should not exist.
 */
export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  // The blackouts and bookings come from the availability endpoint, which is
  // owner-only - so it 404s for anyone the ownership check below would reject.
  const [listing, availability, { data: { user } }, context] = await Promise.all([
    getListing(id).catch(() => null),
    getListingAvailability(id).catch(() => null),
    supabase.auth.getUser(),
    getListingFormContext(),
  ]);

  if (!listing || !availability || listing.owner_id !== user?.id || listing.status === "REMOVED") {
    notFound();
  }

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow">Your inventory</p>
        <h1 className="heading mt-3 text-3xl">Edit listing</h1>
        <p className="body-copy mt-3">
          Changes apply to new bookings only; anyone who has already booked keeps the terms they
          agreed to.
        </p>

        <div className="mt-10">
          <ListingForm
            action={updateListing.bind(null, listing.id)}
            listing={listing}
            availability={{
              blackouts: availability.blackouts,
              bookedRanges: availability.confirmed_bookings,
            }}
            {...context}
          />
        </div>
      </div>
    </Container>
  );
}
