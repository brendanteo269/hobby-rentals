import { Container } from "@/components/ui";
import { CreateListingForm } from "@/components/listings/create-listing-form";
import { getProfileAvailability } from "@/lib/api/profile-availability";
import { getListingLimits } from "@/lib/api/listings";
import { getOwnProfile } from "@/lib/profile";
import { isLocationArea, type LocationArea } from "@/lib/listings";

export const metadata = { title: "Create a listing — HobbyRentals" };

export default async function NewListingPage() {
  const [{ available_days: profileAvailableDays }, profile, { deposit_cap_bps: depositCapBps }] =
    await Promise.all([getProfileAvailability(), getOwnProfile(), getListingLimits()]);
  // The stored value is a plain text column, so a guard rather than a cast:
  // a future free-text migration on profiles should not start pre-filling
  // listings with strings the LocationArea select cannot represent.
  const profileDefaultLocation: LocationArea | null =
    profile?.default_pickup_location && isLocationArea(profile.default_pickup_location)
      ? profile.default_pickup_location
      : null;

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow">Your inventory</p>
        <h1 className="heading mt-3 text-3xl">Create a listing</h1>
        <p className="body-copy mt-3">
          Fields marked with an asterisk are required. Everything here can be edited after it goes
          live.
        </p>

        <div className="mt-10">
          <CreateListingForm
            profileAvailableDays={profileAvailableDays}
            profileDefaultLocation={profileDefaultLocation}
            depositCapBps={depositCapBps}
          />
        </div>
      </div>
    </Container>
  );
}
