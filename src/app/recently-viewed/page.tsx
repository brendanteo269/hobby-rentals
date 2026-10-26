import { Clock } from "lucide-react";
import { Container, ButtonLink, EmptyState } from "@/components/ui";
import { ListingCard } from "@/components/browse/listing-card";
import { getRecentlyViewed } from "@/lib/api/listings";

export const metadata = { title: "Recently viewed — HobbyRentals" };

export default async function RecentlyViewedPage() {
  const listings = await getRecentlyViewed();
  return (
    <Container className="py-16">
      <p className="eyebrow">Pick up where you left off</p>
      <h1 className="heading mt-3 text-3xl">Recently viewed</h1>
      {listings.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon={Clock}
            title="You have no recently viewed listings"
            body="Listings you open will show up here so you can find them again."
            action={<ButtonLink href="/browse">Browse active listings</ButtonLink>}
          />
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
        </ul>
      )}
    </Container>
  );
}
