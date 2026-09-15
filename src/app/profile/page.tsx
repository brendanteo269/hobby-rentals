import { redirect } from "next/navigation";
import { MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOwnProfile } from "@/lib/profile";
import { getProfileAvailability } from "@/lib/api/profile-availability";
import { Badge, Container } from "@/components/ui";
import { isLocationArea, LOCATION_LABELS } from "@/lib/listings";
import {
  ViewTabs,
  RenterView,
  OwnerView,
  type ProfileView,
} from "@/components/profile-views";
import { AccountSettings } from "@/components/account-settings";
import { CreditWallet } from "@/components/credit-wallet";

export const metadata = { title: "Your profile — HobbyRentals" };

/**
 * The view lives in the URL rather than client state, so it survives a reload
 * and can be linked to. Members who only own default to the owning side.
 */
const VIEWS: ProfileView[] = ["renter", "owner", "wallet", "account"];

function isView(value: string | undefined): value is ProfileView {
  return VIEWS.includes(value as ProfileView);
}

function resolveView(requested: string | undefined, wantsToOwn: boolean, wantsToRent: boolean) {
  if (isView(requested)) return requested;
  return wantsToOwn && !wantsToRent ? "owner" : "renter";
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The proxy guard already redirects anonymous visitors; this is defence in
  // depth and narrows the type for the render below.
  if (!user) redirect("/login");

  const profile = await getOwnProfile();
  if (!profile?.onboarded_at) redirect("/onboarding");

  const { view } = await searchParams;
  const active: ProfileView = resolveView(view, profile.wants_to_own, profile.wants_to_rent);

  const memberSince = new Date(profile.created_at).toLocaleDateString("en-SG", {
    month: "long",
    year: "numeric",
  });
  const isVerified = Boolean(user.email_confirmed_at);
  const availability = await getProfileAvailability();

  return (
    <Container className="py-16">
      <p className="eyebrow">Member since {memberSince}</p>
      <h1 className="heading mt-3 text-3xl">{profile.display_name ?? "Your profile"}</h1>
      <p className="body-copy mt-2 flex items-center gap-3">
        {user.email}
        <Badge variant={isVerified ? "dark" : "accent"}>
          {isVerified ? "Verified" : "Pending verification"}
        </Badge>
      </p>

      {profile.preferred_meetup_location && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-soft">
          <MapPin className="size-4" aria-hidden="true" />
          {isLocationArea(profile.preferred_meetup_location)
            ? LOCATION_LABELS[profile.preferred_meetup_location]
            : profile.preferred_meetup_location}
        </p>
      )}

      {profile.bio && <p className="body-copy mt-2 max-w-xl">{profile.bio}</p>}

      <div className="mt-10">
        <ViewTabs active={active} />
        <div className="mt-8">
          {active === "renter" && <RenterView enabled={profile.wants_to_rent} />}
          {active === "owner" && <OwnerView enabled={profile.wants_to_own} availableDays={availability.available_days} />}
          {active === "wallet" && <CreditWallet />}
          {active === "account" && (
            <AccountSettings
              displayName={profile.display_name}
              contactNumber={profile.contact_number}
              preferredMeetupLocation={profile.preferred_meetup_location}
              bio={profile.bio}
            />
          )}
        </div>
      </div>
    </Container>
  );
}
