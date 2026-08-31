import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnProfile } from "@/lib/profile";
import { Container } from "@/components/ui";
import {
  ViewTabs,
  RenterView,
  OwnerView,
  type ProfileView,
} from "@/components/profile-views";

export const metadata = { title: "Your profile — HobbyRentals" };

/**
 * The view lives in the URL rather than client state, so it survives a reload
 * and can be linked to. Members who only own default to the owning side.
 */
function resolveView(requested: string | undefined, wantsToOwn: boolean, wantsToRent: boolean) {
  if (requested === "owner" || requested === "renter") return requested;
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

  return (
    <Container className="py-16">
      <p className="eyebrow">Member since {memberSince}</p>
      <h1 className="display-caps mt-3 text-3xl">{profile.display_name ?? "Your profile"}</h1>
      <p className="body-copy mt-2">{user.email}</p>

      <div className="mt-10">
        <ViewTabs active={active} />
        <div className="mt-8">
          {active === "renter" ? (
            <RenterView enabled={profile.wants_to_rent} />
          ) : (
            <OwnerView enabled={profile.wants_to_own} />
          )}
        </div>
      </div>
    </Container>
  );
}
