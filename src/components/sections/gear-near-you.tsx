import { Container, SectionHead } from "@/components/ui";
import { ListingCard } from "@/components/listing-card";
import { LISTINGS } from "@/lib/marketplace-data";

/** Grid of nearby listings. */
export function GearNearYou() {
  return (
    <Container className="pt-20">
      <SectionHead title="Gear near you" href="/" linkLabel="See everything" />
      <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {LISTINGS.map((listing) => (
          <ListingCard key={listing.title} listing={listing} />
        ))}
      </ul>
    </Container>
  );
}
