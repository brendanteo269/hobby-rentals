"use client";

import { useEffect, useTransition } from "react";
import { emitActivityEvent } from "@/app/analytics/actions";

/**
 * S2-30: records that this bundle was looked at.
 *
 * The landing page ranks bundles by renter interest, and this is where that
 * interest comes from — without it a bundle could never climb the showcase,
 * however often it was clicked.
 *
 * Deliberately not also an event against the bundle's items: a bundle view is
 * interest in the set, not in each thing in it, and counting it both ways
 * would let bundle traffic move the listings rail too. The backend files it
 * under its own category for the same reason.
 *
 * Counted once per viewer per bundle per day, server-side, so a refresh
 * cannot inflate a ranking.
 */
export function BundleViewTelemetry({ bundleId }: { bundleId: string }) {
  const [, startTransition] = useTransition();
  useEffect(() => {
    startTransition(async () => {
      await emitActivityEvent({ event_type: "bundle_view", category: "BUNDLE", bundle_id: bundleId });
    });
  }, [bundleId, startTransition]);
  return null;
}
