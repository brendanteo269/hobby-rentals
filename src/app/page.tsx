import { Suspense } from "react";
import { Hero } from "@/components/sections/hero";
import { BrowseByHobby } from "@/components/sections/browse-by-hobby";
import { TrustFeatures } from "@/components/sections/trust-features";
import { PopularListings, PopularListingsSkeleton } from "@/components/sections/popular-listings";
import { FeaturedBundles } from "@/components/sections/featured-bundles";
import { ListYourGear } from "@/components/sections/list-your-gear";
import { LandingFaq } from "@/components/sections/landing-faq";
import { getOwnProfile } from "@/lib/profile";

export default async function Home() {
  const profile = await getOwnProfile();

  return (
    <>
      <Hero defaultLocation={profile?.default_pickup_location ?? null} />
      <BrowseByHobby />
      {/* Both fetch from the API uncached; streaming them keeps the hero from waiting. */}
      <Suspense fallback={<PopularListingsSkeleton />}>
        <PopularListings />
      </Suspense>
      {/* No skeleton: the section hides itself when there are no bundles, and a
          placeholder that then vanishes would shift the page. */}
      <Suspense fallback={null}>
        <FeaturedBundles />
      </Suspense>
      <TrustFeatures />
      <ListYourGear />
      <LandingFaq />
    </>
  );
}
