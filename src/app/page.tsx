import { Hero } from "@/components/sections/hero";
import { BrowseByHobby } from "@/components/sections/browse-by-hobby";
import { TrustFeatures } from "@/components/sections/trust-features";
import { GearNearYou } from "@/components/sections/gear-near-you";
import { OwnerRenterSplit } from "@/components/sections/owner-renter-split";
import { NewsletterSignup } from "@/components/sections/newsletter-signup";

export default function Home() {
  return (
    <>
      <Hero />
      <BrowseByHobby />
      <TrustFeatures />
      <GearNearYou />
      <OwnerRenterSplit />
      <NewsletterSignup />
    </>
  );
}
