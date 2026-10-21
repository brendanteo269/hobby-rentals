import { redirect } from "next/navigation";
import { AccountSettings } from "@/components/account-settings";
import { RenterPortal, requireRenter } from "@/components/renter-portal";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Profile — HobbyRentals" };

/** The renter's account settings, inside the portal so its tabs stay in reach. The same settings show on the profile's Account tab. */
export default async function RenterProfilePage() {
  const profile = await requireRenter();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <RenterPortal active="Profile" title="Profile">
      <AccountSettings
        email={user.email ?? ""}
        emailVerified={Boolean(user.email_confirmed_at)}
        displayName={profile.display_name}
        contactNumber={profile.contact_number}
        defaultPickupLocation={profile.default_pickup_location}
        bio={profile.bio}
        roles={{ wantsToRent: profile.wants_to_rent, wantsToOwn: profile.wants_to_own }}
      />
    </RenterPortal>
  );
}
