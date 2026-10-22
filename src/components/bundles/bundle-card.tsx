"use client";

import Link from "next/link";
import { Layers } from "lucide-react";
import { Badge, ImageSlot } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import type { Bundle, FeaturedBundleCard } from "@/lib/bundles";
import { BundleFavouriteButton } from "./bundle-favourite-button";

type CardBundle = Bundle | FeaturedBundleCard;

function firstPhoto(bundle: CardBundle): string | undefined {
  const item = bundle.items[0];
  if (!item) return undefined;
  return "photo_urls" in item ? item.photo_urls[0] : item.photo_url ?? undefined;
}

export function BundleCard({ bundle, className = "", onFavouriteRemoved }: {
  bundle: CardBundle;
  className?: string;
  onFavouriteRemoved?: () => void;
}) {
  const favouriteCount = "favourite_count" in bundle ? bundle.favourite_count : undefined;
  const favourited = "is_favourited" in bundle ? bundle.is_favourited : undefined;
  return (
    <li className={`group overflow-hidden card card-lift ${className}`}>
      <Link href={`/bundles/${bundle.id}`} className="relative block overflow-hidden">
        <ImageSlot label={bundle.name} src={firstPhoto(bundle)} className="aspect-[4/3] w-full transition-transform duration-300 ease-out group-hover:scale-105" />
        {/* Dark where an item card's location pill is white, so a bundle
            reads as a different kind of thing at a glance. */}
        <Badge variant="dark" className="absolute left-3 top-3 gap-1">
          <Layers className="size-3" aria-hidden="true" />
          Bundle
        </Badge>
      </Link>
      <div className="p-5">
        <p className="eyebrow">Gear bundle · {"item_count" in bundle ? bundle.item_count : bundle.items.length} {("item_count" in bundle ? bundle.item_count : bundle.items.length) === 1 ? "item" : "items"}</p>
        <Link href={`/bundles/${bundle.id}`} className="mt-1 block">
          <h2 className="text-base font-semibold uppercase tracking-wide">{bundle.name}</h2>
        </Link>
        <p className="body-copy mt-1 line-clamp-2">{bundle.items.map((item) => item.name).join(" · ")}</p>
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2">
          <Link href={`/bundles/${bundle.id}`} className="text-sm">
            {bundle.price_per_day_cents !== null && `${formatMoney(bundle.price_per_day_cents)} / day`}
            {bundle.price_per_day_cents !== null && bundle.price_per_week_cents !== null && " · "}
            {bundle.price_per_week_cents !== null && `${formatMoney(bundle.price_per_week_cents)} / week`}
          </Link>
          {favouriteCount !== undefined && favourited !== undefined && (
            <BundleFavouriteButton bundleId={bundle.id} initiallySaved={favourited} initialCount={favouriteCount} onRemoved={onFavouriteRemoved} />
          )}
        </div>
      </div>
    </li>
  );
}
