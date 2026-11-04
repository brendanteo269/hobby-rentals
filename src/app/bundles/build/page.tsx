import { Container } from "@/components/ui";
import { CrossOwnerBundleBuilder } from "@/components/bundles/cross-owner-bundle-builder";
import { getKit, KitApiError } from "@/lib/api/booking-groups";
import type { KitRebuild } from "@/lib/booking-groups";

export const metadata = { title: "Build a bundle for your activity — HobbyRentals" };

/**
 * S5-08: a cross-owner bundle, suggested from an activity. Distinct from the
 * bundles an owner publishes (/bundles): this one is built for the renter on
 * request, from the listings of any owners, and is not stored.
 *
 * S5-09 Scenario 3: `?from_kit=` opens it prefilled from a kit an owner turned
 * down, to build it again without the declined items.
 */
export default async function BuildBundlePage({ searchParams }: { searchParams: Promise<{ from_kit?: string }> }) {
  const { from_kit: fromKit } = await searchParams;
  const rebuild = fromKit ? await rebuildFrom(fromKit) : undefined;
  return (
    <Container className="pb-16 pt-10">
      <h1 className="heading text-3xl">Build a bundle for your activity</h1>
      <p className="body-copy mt-2 max-w-2xl">
        Tell us what you are planning and when. We suggest a set of gear from different owners that is free for your
        dates, and you can swap, remove or add items before you book.
      </p>
      <div className="mt-8">
        <CrossOwnerBundleBuilder rebuild={rebuild} />
      </div>
    </Container>
  );
}

/** What to rebuild from, or nothing if the kit is not the renter's or has nothing to rebuild: the plain builder is then the right page. */
async function rebuildFrom(kitId: string): Promise<KitRebuild | undefined> {
  try {
    return (await getKit(kitId)).rebuild ?? undefined;
  } catch (error) {
    if (error instanceof KitApiError && error.status === 404) return undefined;
    throw error;
  }
}
