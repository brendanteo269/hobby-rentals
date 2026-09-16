import { redirect } from "next/navigation";
import { MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOwnProfile } from "@/lib/profile";
import { getProfileAvailability } from "@/lib/api/profile-availability";
import { getMyListings } from "@/lib/api/listings";
import { Badge, Container } from "@/components/ui";
import { isLocationArea, LOCATION_LABELS } from "@/lib/listings";
import { ViewTabs, RenterView, OwnerView } from "@/components/profile-views";
import {
  defaultProfileView,
  isProfileView,
  type ProfileView,
} from "@/lib/routes";
import type { Roles } from "@/lib/contact-details";
import { AccountSettings } from "@/components/account-settings";
import { CreditWallet } from "@/components/credit-wallet";

export const metadata = { title: "Your profile — HobbyRentals" };

/**
 * The view lives in the URL rather than client state, so it survives a reload
 * and can be linked to. An absent or unrecognised value falls back to the same
 * rule onboarding uses to choose where to send a member, so the two agree.
 */
function resolveView(requested: string | undefined, roles: Roles): ProfileView {
  return isProfileView(requested) ? requested : defaultProfileView(roles);
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
  // Defence in depth: the middleware gate already turns an un-onboarded member
  // away from this page (S1-02 AC5). This is what stops a future change there
  // from silently rendering a half-configured profile.
  if (!profile?.onboarded_at) redirect("/onboarding");

  const { view } = await searchParams;
  const roles: Roles = {
    wantsToRent: profile.wants_to_rent,
    wantsToOwn: profile.wants_to_own,
  };
  const active: ProfileView = resolveView(view, roles);

  const memberSince = new Date(profile.created_at).toLocaleDateString("en-SG", {
    month: "long",
    year: "numeric",
  });
  const isVerified = Boolean(user.email_confirmed_at);
  const availability = await getProfileAvailability();
  const myListings = await getMyListings();

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

      {/* The one location a member has left: where they hand their gear over.
          Absent for anyone who only rents, which is most of this page's
          visitors on day one. */}
      {profile.default_pickup_location && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-soft">
          <MapPin className="size-4" aria-hidden="true" />
          {isLocationArea(profile.default_pickup_location)
            ? LOCATION_LABELS[profile.default_pickup_location]
            : profile.default_pickup_location}
        </p>
      )}

      {profile.bio && <p className="body-copy mt-2 max-w-xl">{profile.bio}</p>}

      <div className="mt-10">
        <ViewTabs active={active} />
        <div className="mt-8">
          {active === "renter" && <RenterView enabled={profile.wants_to_rent} />}
          {active === "owner" && (
            <OwnerView
              enabled={profile.wants_to_own}
              availableDays={availability.available_days}
              listings={myListings}
            />
          )}
          {active === "wallet" && <CreditWallet />}
          {active === "account" && (
            <AccountSettings
              email={user.email ?? ""}
              emailVerified={isVerified}
              displayName={profile.display_name}
              contactNumber={profile.contact_number}
              defaultPickupLocation={profile.default_pickup_location}
              bio={profile.bio}
              roles={roles}
            />
          )}
        </div>
      </div>
    </Container>
  );
}
