import { Container, ButtonLink, EmptyState } from "@/components/ui";
import { FavouriteListingCard } from "@/components/listings/favourite-listing-card";
import { getFavourites } from "@/lib/api/listings";
import { FavouriteBundleCard } from "@/components/bundles/favourite-bundle-card";
import { getFavouriteBundles } from "@/lib/api/bundles";

export const metadata = { title: "Favourites — HobbyRentals" };

export default async function FavouritesPage() {
  const [favourites, bundleFavourites] = await Promise.all([getFavourites(), getFavouriteBundles()]);
  const empty = favourites.length === 0 && bundleFavourites.length === 0;
  return (
    <Container className="py-16">
      <p className="eyebrow">Saved items</p>
      <h1 className="heading mt-3 text-3xl">Favourites</h1>
      {empty ? (
        <div className="mt-8">
          <EmptyState
            title="No favourites yet"
            body="Save listings you want to return to later."
            action={<ButtonLink href="/browse">Browse active listings</ButtonLink>}
          />
        </div>
      ) : (
        <div className="mt-8 space-y-12">
          {favourites.length > 0 && (
            <section>
              <h2 className="heading text-xl">Listings</h2>
              <ul className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {favourites.map((listing) => <FavouriteListingCard key={listing.id} listing={listing} />)}
              </ul>
            </section>
          )}
          {bundleFavourites.length > 0 && (
            <section>
              <h2 className="heading text-xl">Bundles</h2>
              <ul className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {bundleFavourites.map((bundle) => <FavouriteBundleCard key={bundle.id} bundle={bundle} />)}
              </ul>
            </section>
          )}
        </div>
      )}
    </Container>
  );
}
