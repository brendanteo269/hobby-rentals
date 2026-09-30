import { ButtonLink } from "@/components/ui";
import { OwnerPortal, requireOwner } from "@/components/owner-portal";
import { ProfileAvailabilityCard } from "@/components/profile-availability-card";
import { saveProfileAvailability } from "@/app/profile/actions";
import { getProfileAvailability } from "@/lib/api/profile-availability";
import { isLocationArea, LOCATION_LABELS } from "@/lib/listings";
import { profilePath } from "@/lib/routes";

export const metadata = { title: "Owner settings — HobbyRentals" };

/** Settings that apply to all of the owner's listings. */
export default async function OwnerSettingsPage() {
  const profile = await requireOwner();
  const availability = await getProfileAvailability();
  const pickup = profile.default_pickup_location;

  return (
    <OwnerPortal active="Settings" title="Owner settings">
      <div className="space-y-6">
        <ProfileAvailabilityCard availableDays={availability.available_days} action={saveProfileAvailability} />
        <section className="border border-line bg-white p-5">
          <p className="eyebrow">Default pickup location</p>
          <p className="body-copy mt-1">
            {pickup ? (isLocationArea(pickup) ? LOCATION_LABELS[pickup] : pickup) : "Not set"}
          </p>
          <ButtonLink href={profilePath("account")} variant="outline" className="mt-4 px-3 py-1.5 text-xs">
            Change in account settings
          </ButtonLink>
        </section>
      </div>
    </OwnerPortal>
  );
}
