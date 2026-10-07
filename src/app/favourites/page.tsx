import { Container, ButtonLink, EmptyState } from "@/components/ui";
import { FavouriteListingCard } from "@/components/listings/favourite-listing-card";
import { getFavourites } from "@/lib/api/listings";

export const metadata = { title: "Favourites — HobbyRentals" };

export default async function FavouritesPage() {
  const favourites = await getFavourites();
  return (
    <Container className="py-16">
      <p className="eyebrow">Saved items</p>
      <h1 className="heading mt-3 text-3xl">Favourites</h1>
      {favourites.length > 0 ? (
        <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {favourites.map((listing) => <FavouriteListingCard key={listing.id} listing={listing} />)}
        </ul>
      ) : (
        <div className="mt-8">
          <EmptyState
            title="No favourites yet"
            body="Save listings you want to return to later."
            action={<ButtonLink href="/browse">Browse active listings</ButtonLink>}
          />
        </div>
      )}
    </Container>
  );
}
