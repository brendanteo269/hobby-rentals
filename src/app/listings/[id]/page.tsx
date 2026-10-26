import { notFound } from "next/navigation";
import { Badge, ButtonLink, Container } from "@/components/ui";
import { ListingGallery } from "@/components/listings/listing-gallery";
import { RateLine } from "@/components/browse/listing-card";
import { PassportTimeline } from "@/components/passport/passport-timeline";
import { getBookingAvailability, getListing, getListingCategoryAttributes, getPassport } from "@/lib/api/listings";
import { getMySuspension } from "@/lib/api/overdue";
import { getCategoryDemand } from "@/lib/api/analytics";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/format";
import { CATEGORY_LABELS, CONDITION_LABELS, LOCATION_LABELS, passportBadge } from "@/lib/listings";
import { BookingRequestForm } from "@/components/bookings/booking-request-form";
import { VerifiedOwnerBadge } from "@/components/listings/verified-owner-badge";
import { PromotedBadge } from "@/components/listings/promoted-badge";
import { HighDemandBadge } from "@/components/listings/high-demand-badge";
import { ListingViewTelemetry } from "@/components/analytics/listing-view-telemetry";
import { ListingViewRecorder } from "@/components/listings/listing-view-recorder";
import { WaitlistPanel } from "@/components/bookings/waitlist-panel";
import { AvailabilityAlertPanel } from "@/components/bookings/availability-alert-panel";
import { MessageButton } from "@/components/messages/message-button";
import { ReportListingButton } from "@/components/listings/report-listing-button";
import { getMyWaitlist } from "@/lib/api/waitlist";
import { getMyAvailabilityAlerts } from "@/lib/api/availability-alerts";
import { FavouriteButton } from "@/components/listings/favourite-button";
import { getListingReviews } from "@/lib/api/reviews";
import { RentalReviewSection } from "@/components/reviews/rental-review-section";
import { Suspense } from "react";
import { SimilarListings, SimilarListingsFallback } from "@/components/listings/similar-listings";
import Link from "next/link";
import type { Route } from "next";
import { PersonAvatar } from "@/components/messages/person-avatar";

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

  // S4-07: the renter's own alerts on this listing's blocked-out dates, so
  // the panel can offer to cancel one rather than set it twice. Swallowed
  // like the waitlist below - a missing panel must not cost them the page.
  const availabilityAlerts = canBook
    ? await getMyAvailabilityAlerts(listing.id).catch(() => [])
    : [];

  // S2-15: the renter's own queue places on this listing, so the panel can
  // show "you are waiting" rather than offering to join again. Supplementary -
  // a hiccup here must not cost them the booking form.
  const waitlistEntries = canBook
    ? await getMyWaitlist(true)
        .then((entries) => entries.filter((entry) => entry.listing_id === listing.id))
        .catch(() => [])
    : [];

  // S3-18: overdue return fees pause new bookings, so the form says so before
  // the renter picks dates. Supplementary like the waitlist above - a hiccup
  // here must not cost them the form, and the database refuses the booking
  // regardless of what this managed to show.
  const suspension = canBook ? await getMySuspension().catch(() => undefined) : undefined;

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
  const reviews = await getListingReviews(listing.id).catch(() => ({ average: null, count: 0, reviews: [] }));

  return (
    <Container className="py-16">
      {listing.status === "ACTIVE" && user && user.id !== listing.owner_id && <ListingViewTelemetry listingId={listing.id} category={listing.category} />}
      {/* S4-14: the same audience as the telemetry - the member's own history skips their own listings. */}
      {listing.status === "ACTIVE" && user && user.id !== listing.owner_id && <ListingViewRecorder listingId={listing.id} />}
      <div className="grid gap-10 lg:grid-cols-2">
        <ListingGallery photoUrls={listing.photo_urls} name={listing.name} />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="eyebrow">
              {CATEGORY_LABELS[listing.category]} · {LOCATION_LABELS[listing.location_area]}
            </p>
            <HighDemandBadge highDemand={categoryDemand?.is_high_demand} />
            <PromotedBadge promoted={listing.is_promoted} />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <h1 className="heading text-3xl">{listing.name}</h1>
            <FavouriteButton listingId={listing.id} initiallySaved={listing.is_favourited} initialCount={listing.favourite_count} />
          </div>
          {user && user.id === listing.owner_id && (
            <div className="mt-4 flex flex-wrap gap-2">
              <ButtonLink href={`/listings/${listing.id}/passport`} variant="outline" className="px-4 py-2 text-xs">
                View Product Passport
              </ButtonLink>
              <ButtonLink href={listing.replacement_value_cents == null ? `/listings/${listing.id}/edit#price` : `/listings/${listing.id}/protection`} variant="accent" className="px-4 py-2 text-xs">
                HobbyShield
              </ButtonLink>
              {listing.status === "ACTIVE" && (
                <ButtonLink href={`/listings/${listing.id}/promotion`} variant="outline" className="px-4 py-2 text-xs">
                  {listing.is_promoted ? "View promotion" : "Promote listing"}
                </ButtonLink>
              )}
            </div>
          )}

          <div className="mt-4 border-t border-line pt-4">
            <RateLine listing={listing} />
            <p className="body-copy mt-1">{formatMoney(listing.deposit_cents)} deposit</p>
          </div>

          <p className="body-copy mt-6 whitespace-pre-line">{listing.description}</p>
          <Link href={`/members/${listing.owner_id}` as Route} className="mt-5 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
            <PersonAvatar name={listing.owner_display_name ?? "Member"} size="sm" />
            <span>Listed by <span className="font-medium underline-offset-2 hover:underline">{listing.owner_display_name ?? "Member"}</span></span>
            {/* S4-01 Scenario 3: alongside the owner's details, where a
                renter is already deciding whether to trust them. */}
            <VerifiedOwnerBadge verified={listing.owner_verified} />
          </Link>

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
              overdueDebtCents={suspension?.debt_cents ?? 0}
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
          {canBook && (
            <AvailabilityAlertPanel
              listingId={listing.id}
              unavailableDates={bookingAvailability?.unavailable_dates ?? []}
              alerts={availabilityAlerts}
            />
          )}
          {listing.status === "ACTIVE" && user && user.id !== listing.owner_id && (
            <div className="mt-8 border-t border-line pt-4">
              <ReportListingButton listingId={listing.id} />
            </div>
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
      {/* Shown for any status: a listing with nothing to compare says so rather than leaving a gap. */}
      <Suspense fallback={<SimilarListingsFallback />}>
        <SimilarListings listingId={listing.id} />
      </Suspense>
      <RentalReviewSection title="Reviews for this listing" reviews={reviews} emptyBody="This listing has not received any reviews yet." />
    </Container>
  );
}
