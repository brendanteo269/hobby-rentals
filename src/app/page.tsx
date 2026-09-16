import { Hero } from "@/components/sections/hero";
import { BrowseByHobby } from "@/components/sections/browse-by-hobby";
import { TrustFeatures } from "@/components/sections/trust-features";
import { PopularListings } from "@/components/sections/popular-listings";
import { OwnerRenterSplit } from "@/components/sections/owner-renter-split";

export default function Home() {
  return (
    <>
      <Hero />
      <BrowseByHobby />
      <TrustFeatures />
      <PopularListings />
      <OwnerRenterSplit />
    </>
  );
}
