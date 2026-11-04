import { redirect } from "next/navigation";
import { getOwnProfile } from "@/lib/profile";
import { OnboardingForm } from "@/components/onboarding-form";
import { getOwnAvatarUrl } from "@/lib/api/profile-avatar";

export const metadata = { title: "Welcome — HobbyRentals" };

export default async function OnboardingPage() {
  const profile = await getOwnProfile();

  // Already answered, so there is nothing to ask. Preferences change from the
  // profile page instead.
  if (profile?.onboarded_at) redirect("/profile");

  // Usually none yet, but a member who added one and then left comes back to it.
  const avatarUrl = await getOwnAvatarUrl();

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-20">
      {/* Prefilled when a name was given at signup, where it is optional — it
          is required here, and nobody should have to type it twice. */}
      <OnboardingForm defaultDisplayName={profile?.display_name} avatarUrl={avatarUrl} />
    </div>
  );
}
