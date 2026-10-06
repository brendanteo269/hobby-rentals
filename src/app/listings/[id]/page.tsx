import { notFound } from "next/navigation";
import { Badge, ButtonLink, Container } from "@/components/ui";
import { ListingGallery } from "@/components/listings/listing-gallery";
import { RateLine } from "@/components/browse/listing-card";
import { PassportTimeline } from "@/components/passport/passport-timeline";
import { getBookingAvailability, getListing, getListingCategoryAttributes, getPassport } from "@/lib/api/listings";
import { getCategoryDemand } from "@/lib/api/analytics";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/format";
import { CATEGORY_LABELS, CONDITION_LABELS, LOCATION_LABELS, passportBadge } from "@/lib/listings";
import { BookingRequestForm } from "@/components/bookings/booking-request-form";
import { ListingViewTelemetry } from "@/components/analytics/listing-view-telemetry";
import { WaitlistPanel } from "@/components/bookings/waitlist-panel";
import { MessageButton } from "@/components/messages/message-button";
import { getMyWaitlist } from "@/lib/api/waitlist";

function fallbackAttributeLabel(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function attributeText(value: unknown) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return null;
}

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let listing;
  try {
    listing = await getListing(id);
  } catch {
    notFound();
  }
  const { data: { user } } = await (await createClient()).auth.getUser();

  const canBook = listing.status === "ACTIVE" && user && user.id !== listing.owner_id;
  const bookingAvailability = canBook ? await getBookingAvailability(listing.id) : null;

  // S2-15: the renter's own queue places on this listing, so the panel can
  // show "you are waiting" rather than offering to join again. Supplementary -
  // a hiccup here must not cost them the booking form.
  const waitlistEntries = canBook
    ? await getMyWaitlist(true)
        .then((entries) => entries.filter((entry) => entry.listing_id === listing.id))
        .catch(() => [])
    : [];

  const attributeDefinitions = await getListingCategoryAttributes(listing.category).catch(() => []);
  const definitionsByKey = new Map(attributeDefinitions.map((definition) => [definition.attribute_key, definition]));
  const specificationEntries = Object.entries(listing.attributes)
    .map(([key, value]) => ({ key, label: definitionsByKey.get(key)?.label ?? fallbackAttributeLabel(key), value: attributeText(value) }))
    .filter((entry): entry is { key: string; label: string; value: string } => entry.value !== null)
    .sort((left, right) => (definitionsByKey.get(left.key)?.display_order ?? Number.MAX_SAFE_INTEGER) - (definitionsByKey.get(right.key)?.display_order ?? Number.MAX_SAFE_INTEGER));

  // S2-07: a live listing's condition record, for renters to judge it by.
  // Supplementary, so a failure only hides the section.
  const passport = listing.status === "ACTIVE" ? await getPassport(listing.id).catch(() => null) : null;
  const badge = passportBadge(passport?.serial_status);
  const categoryDemand = listing.status === "ACTIVE" ? await getCategoryDemand(listing.category).catch(() => null) : null;

  return (
    <Container className="py-16">
      {listing.status === "ACTIVE" && user && user.id !== listing.owner_id && <ListingViewTelemetry listingId={listing.id} category={listing.category} />}
      <div className="grid gap-10 lg:grid-cols-2">
        <ListingGallery photoUrls={listing.photo_urls} name={listing.name} />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="eyebrow">
              {CATEGORY_LABELS[listing.category]} · {LOCATION_LABELS[listing.location_area]}
            </p>
            {categoryDemand?.is_high_demand && <Badge variant="accent">🔥 High demand</Badge>}
          </div>
          <h1 className="heading mt-2 text-3xl">{listing.name}</h1>
          {user && user.id === listing.owner_id && (
            <ButtonLink href={`/listings/${listing.id}/passport`} variant="outline" className="mt-4 px-4 py-2 text-xs">
              View Product Passport
            </ButtonLink>
          )}

          <div className="mt-4 border-t border-line pt-4">
            <RateLine listing={listing} />
            <p className="body-copy mt-1">{formatMoney(listing.deposit_cents)} deposit</p>
          </div>

          <p className="body-copy mt-6 whitespace-pre-line">{listing.description}</p>

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
              <dt className="text-ink-soft">Available from</dt>
              <dd className="mt-0.5">{formatDate(listing.available_from)}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Available until</dt>
              <dd className="mt-0.5">{listing.available_until ? formatDate(listing.available_until) : "Indefinitely"}</dd>
            </div>
          </dl>

          {specificationEntries.length > 0 && (
            <section className="mt-6 border-t border-line pt-6">
              <h2 className="heading text-lg">Product specifications</h2>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {specificationEntries.map((attribute) => (
                  <div key={attribute.key}>
                    <dt className="text-ink-soft">{attribute.label}</dt>
                    <dd className="mt-0.5">{attribute.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {listing.status === "ACTIVE" && user && user.id === listing.owner_id && (
            <section className="mt-6 border-t border-line pt-6">
              <h2 className="heading text-lg">Review your pricing</h2>
              <p className="body-copy mt-1">Get a fresh market recommendation and apply it from the editable price field.</p>
              <ButtonLink href={`/listings/${listing.id}/edit#price`} variant="outline" className="mt-4 px-4 py-2 text-xs">
                Review price
              </ButtonLink>
            </section>
          )}

          {listing.status === "ACTIVE" && user && user.id !== listing.owner_id && (
            <BookingRequestForm
              listingId={listing.id}
              availableDates={bookingAvailability?.available_dates ?? []}
              unavailableDates={bookingAvailability?.unavailable_dates ?? []}
              minRentalDays={listing.min_rental_days}
              maxRentalDays={listing.max_rental_days}
              secondaryAction={
                <MessageButton target={{ kind: "listing", listingId: listing.id }} label="Message owner" />
              }
            />
          )}
          {canBook && (
            <WaitlistPanel
              listingId={listing.id}
              unavailableDates={bookingAvailability?.unavailable_dates ?? []}
              entries={waitlistEntries}
            />
          )}
          {listing.status === "PENDING_REMOVAL" && user && user.id !== listing.owner_id && (
            <p className="mt-8 border-t border-line pt-6 text-sm text-ink-soft">
              This listing is being removed after an existing booking concludes. Your confirmed booking remains valid.
            </p>
          )}
          {listing.status !== "ACTIVE" && user && user.id === listing.owner_id && (
            <p className="mt-8 border-t border-line pt-6 text-sm text-ink-soft">
              This listing is {listing.status === "PENDING_REMOVAL" ? `scheduled for removal on ${formatDate(listing.scheduled_removal_at!)}` : listing.status.toLowerCase()}.
            </p>
          )}
        </div>
      </div>

      {passport && (
        <section className="mt-16 border-t border-line pt-10">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="heading text-lg">Product Passport</h2>
            {badge && <Badge variant={passport?.serial_status === "VERIFIED" ? "dark" : "neutral"}>{badge}</Badge>}
          </div>
          <p className="body-copy mt-1">
            This item&apos;s permanent condition record. Nothing here can be edited or deleted, so what you see is
            what was recorded before any rental.
          </p>
          <div className="mt-6">
            <PassportTimeline entries={passport.entries} />
          </div>
        </section>
      )}
    </Container>
  );
}
