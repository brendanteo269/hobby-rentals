"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageSlot } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { BUNDLE_STATUS_LABELS, type FavouriteBundle } from "@/lib/bundles";
import { BundleFavouriteButton } from "./bundle-favourite-button";
import { BundleCard } from "./bundle-card";

export function FavouriteBundleCard({ bundle }: { bundle: FavouriteBundle }) {
  const router = useRouter();
  const active = bundle.status === "ACTIVE";
  if (active) return <BundleCard bundle={{ ...bundle, is_favourited: true }} onFavouriteRemoved={() => router.refresh()} />;
  const primaryPhoto = bundle.items[0]?.photo_urls[0];
  const content = (
    <>
      <ImageSlot label={bundle.name} src={primaryPhoto} className={`aspect-square w-full ${active ? "" : "grayscale opacity-60"}`} />
      <div className="p-4">
        <p className="eyebrow">Gear bundle · {bundle.items.length} {bundle.items.length === 1 ? "item" : "items"}</p>
        <h2 className="heading mt-1.5 text-sm leading-snug">{bundle.name}</h2>
        {active ? (
          <p className="mt-3 border-t border-line pt-3 text-base font-semibold">
            {bundle.price_per_day_cents !== null && `${formatMoney(bundle.price_per_day_cents)} / day`}
            {bundle.price_per_day_cents !== null && bundle.price_per_week_cents !== null && " · "}
            {bundle.price_per_week_cents !== null && `${formatMoney(bundle.price_per_week_cents)} / week`}
          </p>
        ) : <p className="mt-3 text-sm text-ink-soft">Bundle currently unavailable ({BUNDLE_STATUS_LABELS[bundle.status].toLowerCase()}).</p>}
      </div>
    </>
  );
  return (
    <li className={`overflow-hidden card ${active ? "transition-colors hover:border-ink-soft" : "border-dashed bg-surface-muted"}`}>
      {active ? <Link href={`/bundles/${bundle.id}`} className="block">{content}</Link> : <div>{content}</div>}
      <div className="flex justify-end border-t border-line px-3 py-1">
        <BundleFavouriteButton bundleId={bundle.id} initiallySaved initialCount={0} hideCount onRemoved={() => router.refresh()} />
      </div>
    </li>
  );
}
