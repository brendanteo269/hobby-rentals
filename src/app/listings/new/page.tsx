import { Container } from "@/components/ui";
import { CreateListingForm } from "@/components/listings/create-listing-form";
import { getProfileAvailability } from "@/lib/api/profile-availability";

export const metadata = { title: "List your gear — HobbyRentals" };

export default async function NewListingPage() {
  const { available_days: profileAvailableDays } = await getProfileAvailability();
  return (
    <Container className="py-16">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow">Your inventory</p>
        <h1 className="heading mt-3 text-3xl">List your gear</h1>
        <p className="body-copy mt-3">
          Fields marked with an asterisk are required. Everything here can be edited after it goes
          live.
        </p>

        <div className="mt-10">
          <CreateListingForm profileAvailableDays={profileAvailableDays} />
        </div>
      </div>
    </Container>
  );
}
