import { Suspense } from "react";
import { Reveal } from "@/components/reveal";
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
      {/* The hero animates in on its own (see Hero); everything below it fades up on first scroll. */}
      <Hero defaultLocation={profile?.default_pickup_location ?? null} />
      <Reveal>
        <BrowseByHobby />
      </Reveal>
      {/* Both fetch from the API uncached; streaming them keeps the hero from waiting. */}
      <Reveal>
        <Suspense fallback={<PopularListingsSkeleton />}>
          <PopularListings />
        </Suspense>
      </Reveal>
      {/* No skeleton: the section hides itself when there are no bundles, and a
          placeholder that then vanishes would shift the page. */}
      <Reveal>
        <Suspense fallback={null}>
          <FeaturedBundles />
        </Suspense>
      </Reveal>
      <Reveal>
        <TrustFeatures />
      </Reveal>
      <Reveal>
        <ListYourGear />
      </Reveal>
      <Reveal>
        <LandingFaq />
      </Reveal>
    </>
  );
}
