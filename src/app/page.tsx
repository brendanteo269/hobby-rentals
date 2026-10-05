import { Hero } from "@/components/sections/hero";
import { BrowseByHobby } from "@/components/sections/browse-by-hobby";
import { TrustFeatures } from "@/components/sections/trust-features";
import { PopularListings } from "@/components/sections/popular-listings";
import { OwnerRenterSplit } from "@/components/sections/owner-renter-split";
import { getOwnProfile } from "@/lib/profile";

export default async function Home() {
  const profile = await getOwnProfile();

  return (
    <>
      <Hero defaultLocation={profile?.default_pickup_location ?? null} />
      <BrowseByHobby />
      <TrustFeatures />
      <PopularListings />
      <OwnerRenterSplit />
    </>
  );
}
