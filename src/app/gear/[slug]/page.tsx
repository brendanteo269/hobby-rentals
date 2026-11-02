import type { Metadata, Route } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Badge, ButtonLink, Container } from "@/components/ui";
import { ListingGallery } from "@/components/listings/listing-gallery";
import { RateLine } from "@/components/browse/listing-card";
import { VerifiedOwnerBadge } from "@/components/listings/verified-owner-badge";
import { InstantBookBadge } from "@/components/listings/instant-book-badge";
import { RentalReviewSection } from "@/components/reviews/rental-review-section";
import { getPublicListing } from "@/lib/api/public";
import { formatDate, formatMoney } from "@/lib/format";
import { gearPath, loginToAct, shortIdFrom, siteUrl } from "@/lib/gear";
import { CATEGORY_LABELS, CONDITION_LABELS, LOCATION_LABELS, passportBadge } from "@/lib/listings";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const shortId = shortIdFrom(slug);
  return shortId ? getPublicListing(shortId) : null;
}

/** S5-01 Scenario 3: the page's own title, description, canonical URL and link-preview tags. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = await load((await params).slug);
  if (!listing) return { title: "No longer available — HobbyRentals", robots: { index: false } };
  const price = listing.price_per_day_cents !== null ? `${formatMoney(listing.price_per_day_cents)}/day` : `${formatMoney(listing.price_per_week_cents ?? 0)}/week`;
  const title = `${listing.name} for rent, ${price} — HobbyRentals`;
  const description = `Rent this ${listing.brand} in ${LOCATION_LABELS[listing.location_area]}, ${price}. ${listing.description}`.slice(0, 155);
  return {
    metadataBase: siteUrl(),
    title,
    description,
    alternates: { canonical: gearPath(listing) },
    openGraph: {
      type: "website",
      siteName: "HobbyRentals",
      url: gearPath(listing),
      title: `${listing.name} · ${price}`,
      description,
      images: listing.photo_urls.slice(0, 1),
    },
  };
}

/**
 * S5-01: a listing anyone can open without signing in, rendered on the server
 * so its content is in the first HTML. Read-only: booking, messaging and
 * saving send a signed-out visitor to log in and back (Scenario 4). Nothing
 * here records a view: that telemetry belongs to signed-in members.
 */
export default async function PublicListingPage({ params }: Props) {
  const { slug } = await params;
  const listing = await load(slug);
  if (!listing) notFound();
  // Scenario 2: one address per listing. An old name in the URL moves to the current one.
  const canonical = gearPath(listing);
  if (`/gear/${slug}` !== canonical) permanentRedirect(canonical);

  const { data: { user } } = await (await createClient()).auth.getUser();
  const fullListing = `/listings/${listing.id}` as Route;
  const act = user ? fullListing : loginToAct(fullListing);
  const badge = passportBadge(listing.serial_status);

  return (
    <Container className="py-16">
      <div className="grid gap-10 lg:grid-cols-2">
        <ListingGallery photoUrls={listing.photo_urls} name={listing.name} />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="eyebrow">
              {CATEGORY_LABELS[listing.category] ?? listing.category} · {LOCATION_LABELS[listing.location_area]}
            </p>
            <InstantBookBadge enabled={listing.instant_book_enabled} />
            {badge && <Badge variant={listing.serial_status === "VERIFIED" ? "dark" : "neutral"}>Passport: {badge}</Badge>}
          </div>
          <h1 className="heading mt-2 text-3xl">{listing.name}</h1>

          <div className="mt-4 border-t border-line pt-4">
            <RateLine listing={listing} />
            <p className="body-copy mt-1">{formatMoney(listing.deposit_cents)} deposit</p>
          </div>

          <p className="body-copy mt-6 whitespace-pre-line">{listing.description}</p>
          <p className="mt-5 flex items-center gap-2 text-sm text-ink-soft">
            Listed by <span className="font-medium text-ink">{listing.owner_display_name ?? "Member"}</span>
            <VerifiedOwnerBadge verified={listing.owner_verified} />
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-6 text-sm">
            <div>
              <dt className="text-ink-soft">Brand</dt>
              <dd className="mt-0.5">{listing.brand}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Condition</dt>
              <dd className="mt-0.5">{CONDITION_LABELS[listing.condition]}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Collection area</dt>
              <dd className="mt-0.5">{LOCATION_LABELS[listing.location_area]}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Available from</dt>
              <dd className="mt-0.5">{formatDate(listing.available_from)}</dd>
            </div>
          </dl>

          {listing.specifications.length > 0 && (
            <section className="mt-6 border-t border-line pt-6">
              <h2 className="heading text-lg">Product specifications</h2>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {listing.specifications.map((attribute) => (
                  <div key={attribute.label}>
                    <dt className="text-ink-soft">{attribute.label}</dt>
                    <dd className="mt-0.5">{attribute.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <div className="mt-8 flex flex-wrap gap-3 border-t border-line pt-6">
            <ButtonLink href={act}>Request to book</ButtonLink>
            <ButtonLink href={act} variant="outline">Message owner</ButtonLink>
            <ButtonLink href={act} variant="outline">Save</ButtonLink>
          </div>
          {!user && <p className="mt-2 text-xs text-ink-soft">Log in to book, message or save. You&apos;ll come straight back to this listing.</p>}
        </div>
      </div>

      <RentalReviewSection title="Reviews for this listing" reviews={listing.reviews} emptyBody="This listing has not received any reviews yet." />
    </Container>
  );
}
