import Link from "next/link";
import { Container, EmptyState, ImageSlot } from "@/components/ui";
import { browseBundles, BundleApiError } from "@/lib/api/bundles";
import { formatMoney } from "@/lib/format";
import type { Bundle } from "@/lib/bundles";

export const metadata = { title: "Gear bundles — HobbyRentals" };

/**
 * S2-20 Scenario 1: published bundles in the marketplace.
 *
 * A bundle whose component stopped being available is absent here rather than
 * shown as unbookable (Scenario 6) - the backend never returns it - while
 * that component's own listing is unaffected and still on /browse.
 */
export default async function BundlesPage() {
  const { bundles, error } = await loadBundles();

  return (
    <Container className="py-16">
      <p className="eyebrow">Marketplace</p>
      <h1 className="heading mt-3 text-3xl">Gear bundles</h1>
      <p className="body-copy mt-3 max-w-2xl">
        Sets of gear an owner rents out together at a package rate. A bundle is only offered on
        dates every item in it is free at the same time.
      </p>

      <div className="mt-10">
        {error ? (
          <EmptyState title="Bundles are unavailable right now" body={error} />
        ) : bundles.length === 0 ? (
          <EmptyState
            title="No bundles yet"
            body="No owner has published a gear bundle yet. Browse individual listings in the meantime."
          />
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {bundles.map((bundle) => (
              <BundleCard key={bundle.id} bundle={bundle} />
            ))}
          </ul>
        )}
      </div>
    </Container>
  );
}

async function loadBundles(): Promise<{ bundles: Bundle[]; error?: string }> {
  try {
    return { bundles: await browseBundles() };
  } catch (caught) {
    if (caught instanceof BundleApiError) return { bundles: [], error: caught.message };
    throw caught;
  }
}

function BundleCard({ bundle }: { bundle: Bundle }) {
  const cover = bundle.items.find((item) => item.photo_urls.length > 0);

  return (
    <li className="card overflow-hidden">
      <Link href={`/bundles/${bundle.id}`} className="block">
        <ImageSlot
          label={bundle.name}
          src={cover?.photo_urls[0]}
          className="aspect-[4/3] w-full"
        />
        <div className="p-5">
          <p className="eyebrow">
            {bundle.items.length} {bundle.items.length === 1 ? "item" : "items"}
          </p>
          <h2 className="mt-1 text-base font-semibold uppercase tracking-wide">{bundle.name}</h2>
          <p className="body-copy mt-1 line-clamp-2">
            {bundle.items.map((item) => item.name).join(" · ")}
          </p>
          <p className="mt-3 text-sm">
            {bundle.price_per_day_cents !== null && `${formatMoney(bundle.price_per_day_cents)} / day`}
            {bundle.price_per_day_cents !== null && bundle.price_per_week_cents !== null && " · "}
            {bundle.price_per_week_cents !== null && `${formatMoney(bundle.price_per_week_cents)} / week`}
          </p>
        </div>
      </Link>
    </li>
  );
}
