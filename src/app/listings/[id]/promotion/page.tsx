import { notFound } from "next/navigation";
import { ButtonLink, Container } from "@/components/ui";
import { ListingPromotionCard } from "@/components/listings/listing-promotion-card";
import { getListing } from "@/lib/api/listings";
import { getListingPromotionQuote } from "@/lib/api/listing-promotions";
import { createClient } from "@/lib/supabase/server";
import { formatSingaporeDateTime } from "@/lib/format";

export const metadata = { title: "Promote listing — HobbyRentals" };

export default async function PromotionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let listing;
  let quote;
  try {
    // The quote 404s for anyone but the owner.
    [listing, quote] = await Promise.all([getListing(id), getListingPromotionQuote(id)]);
  } catch {
    notFound();
  }
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (user?.id !== listing.owner_id) notFound();

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">Promote listing</p>
        <h1 className="heading mt-3 text-3xl">Promote {listing.name}</h1>
        <p className="body-copy mt-3">Get more renters to see your gear for a fixed fee, paid from your wallet.</p>
        <ButtonLink href={`/listings/${id}`} variant="outline" className="mt-5 px-4 py-2 text-xs">← Back to listing</ButtonLink>
        {quote.promoted_until ? (
          <section className="mt-8 border border-line bg-white p-6">
            <p className="eyebrow">Promotion active</p>
            <h2 className="heading mt-2 text-xl">Promoted until {formatSingaporeDateTime(quote.promoted_until)}</h2>
            <p className="body-copy mt-2">You can promote this listing again once the current promotion ends.</p>
          </section>
        ) : <ListingPromotionCard listingId={id} quote={quote} />}
      </div>
    </Container>
  );
}
