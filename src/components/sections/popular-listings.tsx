import { ButtonLink, Container, SectionHead } from "@/components/ui";
import { getPopularListings } from "@/lib/api/listings";
import { PopularListingsCarousel } from "./popular-listings-carousel";

export async function PopularListings() {
  const popular = await getPopularListings().catch(() => null);
  const hasEnoughInventory = popular !== null && popular.active_inventory_count >= 4;
  return (
    <Container className="pt-20">
      <SectionHead title="Popular listings" />
      {hasEnoughInventory ? <><PopularListingsCarousel listings={popular.results} /><div className="mt-9 flex justify-center"><ButtonLink href="/browse" variant="accent" className="px-10 py-4 text-base shadow-sm hover:-translate-y-0.5 hover:shadow-md">See more</ButtonLink></div></> : <div className="mt-8 rounded-2xl border border-line bg-surface-muted px-6 py-12 text-center"><p className="heading text-lg">More gear is coming soon</p><p className="body-copy mx-auto mt-2 max-w-md">Explore all available gear or list your own to start earning.</p><ButtonLink href="/browse" variant="accent" className="mt-6 px-10 py-4 text-base shadow-sm hover:-translate-y-0.5 hover:shadow-md">See more</ButtonLink></div>}
    </Container>
  );
}
