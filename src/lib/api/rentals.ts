import "server-only";

import { getMyBookings } from "@/lib/api/bookings";
import { getMyBundleBookings } from "@/lib/api/bundles";
import { getMySuspension } from "@/lib/api/overdue";
import { getReviewEligibility } from "@/lib/api/reviews";
import { getMyWaitlist } from "@/lib/api/waitlist";

/**
 * Everything the renter portal's Overview and Bookings tabs read, fetched in
 * parallel. Bookings and the waitlist are the page; a failure there should
 * surface. The rest is supplementary and swallowed, so losing it never costs
 * the renter sight of their bookings.
 */
export async function getRenterActivity() {
  const [bookings, bundleBookings, waitlist, reviewEligibility, suspension] = await Promise.all([
    getMyBookings(),
    getMyBundleBookings(),
    // Open places only: a queue place that was booked, left or lapsed is
    // history the bookings already tell.
    getMyWaitlist(true),
    getReviewEligibility().catch(() => []),
    // S3-18: unpaid late fees pause new bookings, and the banner is how the
    // renter learns that and settles up. Nothing is let through by hiding it:
    // the database refuses a suspended renter's booking whatever the page shows.
    getMySuspension().catch(() => undefined),
  ]);
  return { bookings, bundleBookings, waitlist, reviewEligibility, suspension };
}
