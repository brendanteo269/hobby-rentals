import { ButtonLink } from "@/components/ui";
import { AwayModeCard } from "@/components/away-mode-card";
import { OwnerPortal, requireOwner } from "@/components/owner-portal";
import { ProfileAvailabilityCard } from "@/components/profile-availability-card";
import { saveProfileAvailability } from "@/app/profile/actions";
import { getProfileAvailability } from "@/lib/api/profile-availability";
import { getAway } from "@/lib/api/away";
import { todayIso } from "@/lib/format";
import { isLocationArea, LOCATION_LABELS } from "@/lib/listings";
import { profilePath } from "@/lib/routes";

export const metadata = { title: "Owner settings — HobbyRentals" };

/** Settings that apply to all of the owner's listings. */
export default async function OwnerSettingsPage() {
  const profile = await requireOwner();
  const [availability, away] = await Promise.all([getProfileAvailability(), getAway()]);
  const pickup = profile.default_pickup_location;

  return (
    <OwnerPortal active="Settings" title="Owner settings">
      <div className="space-y-6">
        {/* First: it is the time-sensitive setting. Keyed so a saved or ended
            period starts the card afresh instead of keeping the old form. */}
        <AwayModeCard
          key={away ? `${away.start_date}:${away.end_date}:${away.message ?? ""}` : "off"}
          period={away}
          today={todayIso()}
        />
        <ProfileAvailabilityCard availableDays={availability.available_days} action={saveProfileAvailability} />
        <section className="card p-5">
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
