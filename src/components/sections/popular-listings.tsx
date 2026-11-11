import { ButtonLink, Container, SectionHead, Skeleton } from "@/components/ui";
import { getPopularListings } from "@/lib/api/listings";
import { PopularListingsCarousel } from "./popular-listings-carousel";

export async function PopularListings() {
  const popular = await getPopularListings().catch(() => null);
  const hasEnoughInventory = popular !== null && popular.active_inventory_count >= 4;
  return (
    <Container className="pt-20">
      <SectionHead title="Popular listings" href="/browse" linkLabel="View all" />
      {hasEnoughInventory ? (
        <PopularListingsCarousel listings={popular.results} />
      ) : (
        <div className="mt-8 rounded-2xl border border-line bg-surface-muted px-6 py-12 text-center">
          <p className="heading text-lg">New gear is being listed</p>
          <p className="body-copy mx-auto mt-2 max-w-md">
            Have a look at what&apos;s available now, or put up something of your own.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/browse">Browse gear</ButtonLink>
            <ButtonLink href="/listings/new" variant="outline">List an item</ButtonLink>
          </div>
        </div>
      )}
    </Container>
  );
}

/** Stands in for PopularListings while the API answers, so the hero can render first. */
export function PopularListingsSkeleton() {
  return (
    <Container className="pt-20">
      <SectionHead title="Popular listings" href="/browse" linkLabel="View all" />
      <div className="mt-8 flex gap-5 overflow-hidden">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-80 min-w-[17rem] rounded-2xl sm:min-w-[18.5rem]" />
        ))}
      </div>
    </Container>
  );
}
