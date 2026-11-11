import { Container, SectionHead } from "@/components/ui";
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
      <SectionHead title="Gear bundles" href="/bundles" linkLabel="View all" />
      <p className="body-copy mt-2 max-w-2xl">
        Everything a trip needs, booked together instead of item by item.
      </p>

      <FeaturedBundlesCarousel bundles={bundles} />
    </Container>
  );
}
