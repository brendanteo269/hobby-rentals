import { ButtonLink, Container, SectionHead } from "@/components/ui";
import { getFeaturedBundles } from "@/lib/api/bundles";
import { FeaturedBundlesCarousel } from "./featured-bundles-carousel";

/**
 * S2-30: the landing page's gear bundle showcase.
 *
 * Shown only when there is something worth showing. A bundle whose component
 * has been archived or blacked out is already filtered out by the API, so an
 * empty list here means the marketplace genuinely has no complete sets - and
 * the section disappears rather than advertising an empty shelf.
 *
 * A failure to reach the API is treated the same way: the landing page is the
 * first thing a visitor sees, and it should degrade quietly.
 */
export async function FeaturedBundles() {
  const bundles = await getFeaturedBundles().catch(() => []);
  if (bundles.length === 0) return null;

  return (
    <Container className="pt-20">
      <SectionHead title="Popular Gear bundles" />
      <p className="body-copy mt-2 max-w-2xl">
        Complete sets so you can book everything a trip needs in one go instead
        of piecing it together item by item.
      </p>

      <FeaturedBundlesCarousel bundles={bundles} />

      <div className="mt-9 flex justify-center">
        <ButtonLink
          href="/bundles"
          variant="accent"
          className="px-10 py-4 text-base shadow-sm hover:-translate-y-0.5 hover:shadow-md"
        >
          Explore more curated bundles
        </ButtonLink>
      </div>
    </Container>
  );
}
