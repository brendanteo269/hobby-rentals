import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, ButtonLink, Container, ImageSlot } from "@/components/ui";
import { BundleBookingPanel } from "@/components/bundles/bundle-booking-panel";
import { BookingPauseNotice } from "@/components/listings/booking-pause-notice";
import { BundleViewTelemetry } from "@/components/analytics/bundle-view-telemetry";
import { getBundle, getBundleAvailability } from "@/lib/api/bundles";
import { formatMoney, todayIso } from "@/lib/format";
import { BUNDLE_STATUS_LABELS, SINGLE_OWNER_BUNDLE_LABEL, type BundleAvailability } from "@/lib/bundles";
import { CATEGORY_LABELS, LISTING_STATUS_LABELS, rentalDurationLimits } from "@/lib/listings";
import { createClient } from "@/lib/supabase/server";
import { BundleFavouriteButton } from "@/components/bundles/bundle-favourite-button";
import { getBundleReviews } from "@/lib/api/reviews";
import { RentalReviewSection } from "@/components/reviews/rental-review-section";
import { ShareButton } from "@/components/listings/share-button";
import { siteUrl } from "@/lib/env";
import { gearBundlePath } from "@/lib/gear";
import { absoluteUrl, shareText } from "@/lib/share";

export const metadata = { title: "Bundle — HobbyRentals" };

/**
 * One bundle in full: what is in it, what it costs, and when every item in it
 * is free at once (S2-20 Scenarios 2 and 4).
 *
 * The API already 404s a bundle this caller cannot see, so an unpublished one
 * only reaches here for its owner - who gets the status badge and an edit
 * link instead of a calendar, since there is nothing to book.
 */
export default async function BundlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bundle = await getBundle(id).catch(() => null);
  if (!bundle) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = bundle.owner_id === user?.id;
  const published = bundle.status === "ACTIVE";

  // Only a published bundle has a calendar - availability intersects its
  // components, and an unpublished one has at least one that is gone.
  const availability: BundleAvailability | null = published
    ? await getBundleAvailability(bundle.id).catch(() => null)
    : null;

  const durationLimits = rentalDurationLimits(bundle);
  const reviews = await getBundleReviews(bundle.id).catch(() => ({ average: null, count: 0, reviews: [] }));

  return (
    <Container className="py-16">
      {/* Only a renter's view is interest; an owner checking their own set is
          not demand, exactly as the listing page treats it. */}
      {published && user && user.id !== bundle.owner_id && <BundleViewTelemetry bundleId={bundle.id} />}
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">
              {SINGLE_OWNER_BUNDLE_LABEL} · {bundle.items.length} {bundle.items.length === 1 ? "item" : "items"}
            </p>
            <h1 className="heading mt-3 text-3xl">{bundle.name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* S5-16 Scenario 4: only a published bundle has a public page to share. */}
            {published && (
              <ShareButton url={absoluteUrl(gearBundlePath({ name: bundle.name, short_id: bundle.id.slice(0, 8) }), siteUrl())} text={shareText(bundle)} what="bundle" />
            )}
            <BundleFavouriteButton bundleId={bundle.id} initiallySaved={bundle.is_favourited} initialCount={bundle.favourite_count} />
            {!published && <Badge variant="warning">{BUNDLE_STATUS_LABELS[bundle.status]}</Badge>}
            {isOwner && bundle.status !== "REMOVED" && (
              <ButtonLink variant="outline" href={`/listings/mine/bundles/${bundle.id}/edit`} className="px-3 py-1.5 text-xs">
                Edit bundle
              </ButtonLink>
            )}
          </div>
        </div>

        {/* S5-15 Scenario 2: under the name - the owner's pause covers every item in the set. */}
        {availability?.booking_pause && (
          <div className="mt-4">
            <BookingPauseNotice pause={availability.booking_pause} today={todayIso()} />
          </div>
        )}

        {bundle.description && <p className="body-copy mt-4">{bundle.description}</p>}

        {!published && (
          <p role="status" className="mt-6 rounded-lg border-l-2 border-accent bg-accent-soft px-3 py-2 text-sm text-ink">
            This bundle is not in the marketplace right now. Its listings are unaffected and can
            still be booked on their own.
          </p>
        )}

        <section className="mt-8 border-t border-line pt-6">
          <h2 className="text-base font-semibold uppercase tracking-wide">What&apos;s included</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {/* Required items first; optional ones close the list, set apart. */}
            {[...bundle.items].sort((a, b) => Number(a.is_optional) - Number(b.is_optional)).map((item) => (
              <li key={item.id} className={`card overflow-hidden ${item.is_optional ? "border-2 border-dashed border-accent" : ""}`}>
                <Link href={`/listings/${item.id}`} className="block">
                  <ImageSlot label={item.name} src={item.photo_urls[0]} className="aspect-[4/3] w-full" />
                  <div className="p-4">
                    <p className="eyebrow">{CATEGORY_LABELS[item.category] ?? item.category} · {item.brand}</p>
                    <p className="mt-1 text-sm font-medium">
                      {item.name}
                      {item.is_optional && <Badge variant="warning" className="ml-2">Optional extra</Badge>}
                    </p>
                    <p className="body-copy mt-1">
                      {item.price_per_day_cents !== null && `${formatMoney(item.price_per_day_cents)} / day`}
                      {item.price_per_day_cents !== null && item.price_per_week_cents !== null && " · "}
                      {item.price_per_week_cents !== null && `${formatMoney(item.price_per_week_cents)} / week`}
                      {" on its own"}
                    </p>
                    {item.is_optional && item.optional_deduction_cents !== null && (
                      <p className="mt-1 text-sm font-medium text-accent-dark">Skip it and save {formatMoney(item.optional_deduction_cents)} each day.</p>
                    )}
                    {item.alternative && (
                      <p className="body-copy mt-1">If it is out for your dates, {item.alternative.name} is used instead.</p>
                    )}
                    {item.status !== "ACTIVE" && (
                      <p className="mt-2 text-xs text-accent-dark">
                        {LISTING_STATUS_LABELS[item.status]} — this is why the bundle is unpublished.
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 border-t border-line pt-6">
          <h2 className="text-base font-semibold uppercase tracking-wide">Package rate</h2>
          <p className="body-copy mt-1">
            What the whole set costs, however it compares to booking each item on its own.
            {durationLimits && ` This bundle rents for ${durationLimits}.`}
          </p>
          <dl className="mt-4 space-y-1 text-sm">
            {bundle.price_per_day_cents !== null && (
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink-soft">Daily rate</dt>
                <dd>{formatMoney(bundle.price_per_day_cents)} / day</dd>
              </div>
            )}
            {bundle.price_per_week_cents !== null && (
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink-soft">Weekly rate</dt>
                <dd>{formatMoney(bundle.price_per_week_cents)} / week</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-ink-soft">Security deposit</dt>
              <dd>{formatMoney(bundle.deposit_cents)}</dd>
            </div>
          </dl>
        </section>

        {availability && (
          <BundleBookingPanel
            bundleId={bundle.id}
            availability={availability}
            minRentalDays={bundle.min_rental_days}
            maxRentalDays={bundle.max_rental_days}
            optionalItems={bundle.items
              .filter((item) => item.is_optional)
              .map((item) => ({ id: item.id, name: item.name, deduction_cents: item.optional_deduction_cents ?? 0 }))}
          />
        )}
        <RentalReviewSection title="Reviews for this bundle" reviews={reviews} emptyBody="This bundle has not received any reviews yet." />
      </div>
    </Container>
  );
}
