"use client";

import { setBundleFavourite } from "@/app/bundles/[id]/favourite-actions";
import { FavouriteButton } from "@/components/listings/favourite-button";

export function BundleFavouriteButton(props: {
  bundleId: string;
  initiallySaved: boolean;
  initialCount: number;
  hideCount?: boolean;
  onRemoved?: () => void;
}) {
  return <FavouriteButton listingId={props.bundleId} initiallySaved={props.initiallySaved} initialCount={props.initialCount} hideCount={props.hideCount} onRemoved={props.onRemoved} toggleAction={setBundleFavourite} />;
}
