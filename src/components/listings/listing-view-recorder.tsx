"use client";

import { useEffect, useTransition } from "react";
import { emitListingView } from "@/app/listings/[id]/view-actions";

/** S4-14: adds this listing to the signed-in member's recently viewed history. */
export function ListingViewRecorder({ listingId }: { listingId: string }) {
  const [, startTransition] = useTransition();
  useEffect(() => {
    startTransition(async () => { await emitListingView(listingId); });
  }, [listingId, startTransition]);
  return null;
}
