import { Container } from "@/components/ui";
import { Hero } from "@/components/sections/hero";
import { BrowseByHobby } from "@/components/sections/browse-by-hobby";
import { ThreeSteps } from "@/components/sections/three-steps";
import { GearNearYou } from "@/components/sections/gear-near-you";
import { SplitPanel } from "@/components/sections/split-panel";
import { NewsletterSignup } from "@/components/sections/newsletter-signup";

export default function Home() {
  return (
    <>
      <Hero />
      <BrowseByHobby />
      <ThreeSteps />
      <GearNearYou />

      <Container className="pt-20">
        <SplitPanel
          title="Earn from the gear you don't use"
          body="The average camera body sits idle 340 days a year. List it in four minutes, set your own dates, and keep 85% of every booking."
          ctaLabel="List your gear"
          ctaHref="/signup"
          imageLabel="Potter shaping clay on a wheel"
          imageSide="right"
        />
        <SplitPanel
          title="Covered on both sides"
          body="Singpass identity checks on every account, a photographed handover in the app, and damage cover to $5,000 on each rental. Payouts land two days after return."
          ctaLabel="How cover works"
          ctaHref="/"
          imageLabel="An owner handing over a case of gear"
          imageSide="left"
        />
      </Container>

      <NewsletterSignup />
    </>
  );
}
