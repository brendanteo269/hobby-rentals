import { Container } from "@/components/ui";
import { CrossOwnerBundleBuilder } from "@/components/bundles/cross-owner-bundle-builder";

export const metadata = { title: "Build a bundle for your activity — HobbyRentals" };

/**
 * S5-08: a cross-owner bundle, suggested from an activity. Distinct from the
 * bundles an owner publishes (/bundles): this one is built for the renter on
 * request, from the listings of any owners, and is not stored.
 */
export default function BuildBundlePage() {
  return (
    <Container className="pb-16 pt-10">
      <h1 className="heading text-3xl">Build a bundle for your activity</h1>
      <p className="body-copy mt-2 max-w-2xl">
        Tell us what you are planning and when. We suggest a set of gear from different owners that is free for your
        dates, and you can swap, remove or add items before you book.
      </p>
      <div className="mt-8">
        <CrossOwnerBundleBuilder />
      </div>
    </Container>
  );
}
