import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ButtonLink, Container, ImageSlot } from "@/components/ui";
import { RentalReviewSection } from "@/components/reviews/rental-review-section";
import { ShareButton } from "@/components/listings/share-button";
import { BookingPauseNotice } from "@/components/listings/booking-pause-notice";
import { getPublicBundle } from "@/lib/api/public";
import { formatMoney, todayIso } from "@/lib/format";
import { siteUrl } from "@/lib/env";
import { gearBundlePath, gearPath, loginToAct, shortIdFrom } from "@/lib/gear";
import { CATEGORY_LABELS } from "@/lib/listings";
import { absoluteUrl, shareText } from "@/lib/share";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const shortId = shortIdFrom(slug);
  return shortId ? getPublicBundle(shortId) : null;
}

function price(bundle: { price_per_day_cents: number | null; price_per_week_cents: number | null }) {
  return bundle.price_per_day_cents !== null ? `${formatMoney(bundle.price_per_day_cents)}/day` : `${formatMoney(bundle.price_per_week_cents ?? 0)}/week`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const bundle = await load((await params).slug);
  if (!bundle) return { title: "No longer available — HobbyRentals", robots: { index: false } };
  const items = bundle.items.map((item) => item.name).join(", ");
  const description = `Gear bundle of ${bundle.items.length} items for ${price(bundle)}: ${items}.`.slice(0, 155);
  return {
    metadataBase: siteUrl(),
    title: `${bundle.name} bundle for rent, ${price(bundle)} — HobbyRentals`,
    description,
    alternates: { canonical: gearBundlePath(bundle) },
    openGraph: {
      type: "website",
      siteName: "HobbyRentals",
      url: gearBundlePath(bundle),
      title: `${bundle.name} · ${price(bundle)}`,
      description,
      images: bundle.items.flatMap((item) => item.photo_urls).slice(0, 1),
    },
  };
}

/** S5-01: a gear bundle anyone can open without signing in. Its items link to their own public pages. */
export default async function PublicBundlePage({ params }: Props) {
  const { slug } = await params;
  const bundle = await load(slug);
  if (!bundle) notFound();
  const canonical = gearBundlePath(bundle);
  if (`/gear/bundles/${slug}` !== canonical) permanentRedirect(canonical);

  const { data: { user } } = await (await createClient()).auth.getUser();
  const fullBundle = `/bundles/${bundle.id}` as Route;
  const act = user ? fullBundle : loginToAct(fullBundle);

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">Gear bundle · {bundle.items.length} {bundle.items.length === 1 ? "item" : "items"}</p>
        <h1 className="heading mt-3 text-3xl">{bundle.name}</h1>
        <div className="mt-3">
          <ShareButton url={absoluteUrl(canonical, siteUrl())} text={shareText(bundle)} what="bundle" />
        </div>
        {bundle.booking_pause && (
          <div className="mt-4">
            <BookingPauseNotice pause={bundle.booking_pause} today={todayIso()} />
          </div>
        )}
        {bundle.description && <p className="body-copy mt-4">{bundle.description}</p>}

        <section className="mt-8 border-t border-line pt-6">
          <h2 className="text-base font-semibold uppercase tracking-wide">What&apos;s included</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {bundle.items.map((item) => (
              <li key={item.short_id} className="card overflow-hidden">
                <Link href={gearPath(item)} className="block">
                  <ImageSlot label={item.name} src={item.photo_urls[0]} className="aspect-[4/3] w-full" />
                  <div className="p-4">
                    <p className="eyebrow">{CATEGORY_LABELS[item.category] ?? item.category} · {item.brand}</p>
                    <p className="mt-1 text-sm font-medium">{item.name}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 border-t border-line pt-6">
          <h2 className="text-base font-semibold uppercase tracking-wide">Package rate</h2>
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

        <div className="mt-8 flex flex-wrap gap-3 border-t border-line pt-6">
          <ButtonLink href={act}>Request to book</ButtonLink>
          <ButtonLink href={act} variant="outline">Save</ButtonLink>
        </div>
        {!user && <p className="mt-2 text-xs text-ink-soft">Log in to book or save. You&apos;ll come straight back to this bundle.</p>}

        <RentalReviewSection title="Reviews for this bundle" reviews={bundle.reviews} emptyBody="This bundle has not received any reviews yet." />
      </div>
    </Container>
  );
}
