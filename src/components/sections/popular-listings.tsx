import { Container, SectionHead } from "@/components/ui";
import { ListingCard } from "@/components/listing-card";
import { LISTINGS } from "@/lib/marketplace-data";

/**
 * Grid of hand-picked listings.
 *
 * "Popular" is a label, not a ranking — LISTINGS is hand-authored placeholder
 * data (see marketplace-data.ts), and the real API has no popularity/booking
 * count field yet to sort by.
 */
export function PopularListings() {
  return (
    <Container className="pt-20">
      <SectionHead title="Popular listings" href="/browse" linkLabel="See all" />
      <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {LISTINGS.map((listing) => (
          <ListingCard key={listing.title} listing={listing} />
        ))}
      </ul>
    </Container>
  );
}
