import { redirect } from "next/navigation";
import { getOwnProfile } from "@/lib/profile";
import { OnboardingForm } from "@/components/onboarding-form";

export const metadata = { title: "Welcome — HobbyRentals" };

export default async function OnboardingPage() {
  const profile = await getOwnProfile();

  // Already answered, so there is nothing to ask. Preferences change from the
  // profile page instead.
  if (profile?.onboarded_at) redirect("/profile");

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-20">
      <OnboardingForm />
    </div>
  );
}
