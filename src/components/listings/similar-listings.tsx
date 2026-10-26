import { ListingCard } from "@/components/browse/listing-card";
import { CardCarousel } from "@/components/listings/card-carousel";
import { getSimilarListings } from "@/lib/api/listings";

/** Compact fixed-width cards, so as many fit as the page allows and the next one peeks in on narrow screens. */
const CARD_WIDTH = "h-auto! w-52 shrink-0 snap-start sm:w-56";

/**
 * S4-10: alternatives to the listing being viewed. Supplementary, so a failure
 * reads the same as having nothing to recommend and never costs the renter the
 * rest of the page.
 */
export async function SimilarListings({ listingId }: { listingId: string }) {
  const listings = await getSimilarListings(listingId).catch(() => []);
  return (
    <section className="mt-16 border-t border-line pt-10">
      {listings.length === 0 ? (
        <>
          <h2 className="heading text-lg">Similar listings</h2>
          <p className="body-copy mt-3">No similar listings are available.</p>
        </>
      ) : (
        <CardCarousel title="Similar listings">
          {listings.map((listing) => <ListingCard key={listing.id} listing={listing} className={CARD_WIDTH} />)}
        </CardCarousel>
      )}
    </section>
  );
}

export function SimilarListingsFallback() {
  return (
    <section className="mt-16 border-t border-line pt-10" aria-busy="true">
      <h2 className="heading text-lg">Similar listings</h2>
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((slot) => <div key={slot} className="card aspect-[4/5] animate-pulse bg-surface-muted" />)}
      </div>
    </section>
  );
}
