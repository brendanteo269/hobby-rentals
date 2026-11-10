import { notFound } from "next/navigation";
import { Badge, Container } from "@/components/ui";
import { BookingPauseNotice } from "@/components/listings/booking-pause-notice";
import { ListingGallery } from "@/components/listings/listing-gallery";
import { RateLine } from "@/components/browse/listing-card";
import { PassportTimeline } from "@/components/passport/passport-timeline";
import { getBookingAvailability, getListing, getListingCategoryAttributes, getPassport } from "@/lib/api/listings";
import { getMySuspension } from "@/lib/api/overdue";
import { getCategoryDemand } from "@/lib/api/analytics";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney, todayIso } from "@/lib/format";
import { CATEGORY_LABELS, CONDITION_LABELS, LOCATION_LABELS, passportBadge } from "@/lib/listings";
import { BookingRequestForm } from "@/components/bookings/booking-request-form";
import { VerifiedOwnerBadge } from "@/components/listings/verified-owner-badge";
import { ListingPerks } from "@/components/listings/listing-perks";
import { OwnerListingTools } from "@/components/listings/owner-listing-tools";
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
import { getMyRenterTrust } from "@/lib/api/verification";
import { getListingPromoCodes } from "@/lib/api/promo-codes";
import { ListingPromoCodes } from "@/components/listings/listing-promo-codes";
import { FavouriteButton } from "@/components/listings/favourite-button";
import { getListingReviews } from "@/lib/api/reviews";
import { RentalReviewSection } from "@/components/reviews/rental-review-section";
import { Suspense } from "react";
import { SimilarListings, SimilarListingsFallback } from "@/components/listings/similar-listings";
import Link from "next/link";
import type { Route } from "next";
import { PersonAvatar } from "@/components/person-avatar";
import { AskAboutItem } from "@/components/listings/ask-about-item";
import { ListingQuestionsSection } from "@/components/listings/listing-questions-section";
import { OwnerQuestionsPanel } from "@/components/listings/owner-questions-panel";
import { getOwnerQuestions, getPublicQuestions } from "@/lib/api/listing-questions";
import { OwnerResponseTime } from "@/components/listings/owner-response-time";
import { ShareButton } from "@/components/listings/share-button";
import { siteUrl } from "@/lib/env";
import { gearPath } from "@/lib/gear";
import { absoluteUrl, shareText } from "@/lib/share";

function fallbackAttributeLabel(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function attributeText(value: unknown) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return null;
}

export default async function ListingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  // ?start=&end= - a link that already knows the dates. An offer on a gear
  // request (S5-13) and a fulfilled availability alert (S4-07) both send the
  // renter here with the dates they already said they wanted.
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const { id } = await params;
  const { start: linkedStart, end: linkedEnd } = await searchParams;
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

  // S5-11: whether this renter clears the Trusted Renter bar, so the form
  // can say that their booking confirms on the spot rather than leaving them
  // to find out by pressing the button. Only asked when it could matter.
  // Swallowed: the booking still works, it just says less.
  const instantBookEligible = Boolean(
    canBook && listing.instant_book_enabled && (await getMyRenterTrust().catch(() => undefined))?.trusted,
  );

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
  // S5-07: supplementary like the reviews - a failure hides the section, never the page.
  const isOwner = Boolean(user && user.id === listing.owner_id);
  // S5-12. Owner-only: the endpoint 404s for anyone else, and a code is
  // something a renter is given rather than something they can read off the
  // page. Swallowed - a missing panel must not cost the owner the listing.
  const promoCodes = isOwner ? await getListingPromoCodes(listing.id).catch(() => []) : [];
  const publicQuestions = listing.status === "ACTIVE" ? await getPublicQuestions(listing.id).catch(() => []) : [];
  const ownerQuestions = isOwner ? await getOwnerQuestions(listing.id).catch(() => null) : null;

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
            <div className="flex flex-wrap items-center gap-2">
              {/* S5-16 Scenario 4: a listing that is not live has no public page to share. */}
              {listing.status === "ACTIVE" && (
                <ShareButton url={absoluteUrl(gearPath({ name: listing.name, short_id: listing.id.slice(0, 8) }), siteUrl())} text={shareText(listing)} />
              )}
              <FavouriteButton listingId={listing.id} initiallySaved={listing.is_favourited} initialCount={listing.favourite_count} />
            </div>
          </div>
          <div className="mt-4 border-t border-line pt-4">
            <RateLine listing={listing} />
            <p className="body-copy mt-1">{formatMoney(listing.deposit_cents)} deposit</p>
            {/* S5-11 Scenario 1 / S6-02 Scenario 2: terms of the rental, so with the price. */}
            <ListingPerks instantBook={listing.instant_book_enabled} guide={listing.has_guide} delivery={listing} />
          </div>

          {/* S5-15 Scenario 2: with the price, before the renter scrolls to
              the dates - the calendar alone does not say why or until when. */}
          {bookingAvailability?.booking_pause && (
            <div className="mt-4">
              <BookingPauseNotice pause={bookingAvailability.booking_pause} today={todayIso()} />
            </div>
          )}

          <p className="body-copy mt-6 whitespace-pre-line">{listing.description}</p>
          <Link href={`/members/${listing.owner_id}` as Route} className="mt-5 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
            <PersonAvatar name={listing.owner_display_name ?? "Member"} imageUrl={listing.owner_avatar_url} size="sm" />
            <span>Listed by <span className="font-medium underline-offset-2 hover:underline">{listing.owner_display_name ?? "Member"}</span></span>
            {/* S4-01 Scenario 3: alongside the owner's details, where a
                renter is already deciding whether to trust them. */}
            <VerifiedOwnerBadge verified={listing.owner_verified} />
          </Link>
          <OwnerResponseTime band={listing.owner_response_time} className="mt-1" />

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

          {listing.status === "ACTIVE" && user && !isOwner && <AskAboutItem listingId={listing.id} />}
          {ownerQuestions && <OwnerQuestionsPanel listingId={listing.id} data={ownerQuestions} />}

          {/* The owner's counterpart of the booking form below. Pricing review lives in it. */}
          {isOwner && <OwnerListingTools listing={listing} />}

          {/* S5-12: what the owner is currently offering on this listing, and
              why a code a renter mentioned did or did not work. */}
          {isOwner && <ListingPromoCodes listingId={listing.id} codes={promoCodes} />}

          {listing.status === "ACTIVE" && user && user.id !== listing.owner_id && (
            <BookingRequestForm
              listingId={listing.id}
              availableDates={bookingAvailability?.available_dates ?? []}
              unavailableDates={bookingAvailability?.unavailable_dates ?? []}
              minRentalDays={listing.min_rental_days}
              maxRentalDays={listing.max_rental_days}
              overdueDebtCents={suspension?.debt_cents ?? 0}
              initialStartDate={linkedStart}
              initialEndDate={linkedEnd}
              instantBook={listing.instant_book_enabled}
              instantBookEligible={instantBookEligible}
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
      <ListingQuestionsSection questions={publicQuestions} />
      <RentalReviewSection title="Reviews for this listing" reviews={reviews} emptyBody="This listing has not received any reviews yet." />
    </Container>
  );
}
