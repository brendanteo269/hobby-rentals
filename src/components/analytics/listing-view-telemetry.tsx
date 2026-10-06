"use client";

import { useEffect, useTransition } from "react";
import { emitActivityEvent } from "@/app/analytics/actions";

export function ListingViewTelemetry({ listingId, category }: { listingId: string; category: string }) {
  const [, startTransition] = useTransition();
  useEffect(() => {
    startTransition(async () => { await emitActivityEvent({ event_type: "listing_view", category, listing_id: listingId }); });
  }, [category, listingId, startTransition]);
  return null;
}
