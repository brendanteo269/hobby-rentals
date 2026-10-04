import Link from "next/link";
import { Badge } from "@/components/ui";
import { BundleLifecycleActions } from "@/components/bundles/bundle-lifecycle-actions";
import { OwnerBundleBookingList } from "@/components/bundles/owner-bundle-booking-list";
import { formatDateTime, formatMoney } from "@/lib/format";
import {
  BUNDLE_EVENT_LABELS,
  BUNDLE_STATUS_LABELS,
  type Bundle,
  type BundleBooking,
  type BundleEvent,
  type BundleStatus,
} from "@/lib/bundles";
import { LISTING_STATUS_LABELS } from "@/lib/listings";

/** ACTIVE is the one status that should stand out; UNPUBLISHED wants attention. */
const STATUS_BADGE_VARIANT: Record<BundleStatus, "neutral" | "accent" | "dark"> = {
  ACTIVE: "dark",
  UNPUBLISHED: "accent",
  REMOVED: "neutral",
};

/**
 * One bundle on the owner's inventory, with its booking requests and the
 * trail explaining any automatic unpublish (S2-20 Scenario 6).
 */
export function BundleRow({
  bundle,
  bookings,
  events,
}: {
  bundle: Bundle;
  bookings: BundleBooking[];
  events?: BundleEvent[];
}) {
  const unavailable = bundle.items.filter((item) => item.status !== "ACTIVE");

  return (
    <li className="border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">
            {bundle.items.length} {bundle.items.length === 1 ? "item" : "items"}
          </p>
          <h2 className="mt-1 text-base font-semibold uppercase tracking-wide">
            <Link href={`/bundles/${bundle.id}`} className="hover:underline">
              {bundle.name}
            </Link>
          </h2>
          {/* Reads the same way a listing row's price does. */}
          <p className="body-copy mt-1">
            {bundle.price_per_day_cents !== null && `${formatMoney(bundle.price_per_day_cents)} / day`}
            {bundle.price_per_day_cents !== null && bundle.price_per_week_cents !== null && " · "}
            {bundle.price_per_week_cents !== null && `${formatMoney(bundle.price_per_week_cents)} / week`}
          </p>
        </div>
        <Badge variant={STATUS_BADGE_VARIANT[bundle.status]}>{BUNDLE_STATUS_LABELS[bundle.status]}</Badge>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-soft">
        {bundle.items.map((item) => (
          <li key={item.id}>
            <Link href={`/listings/${item.id}`} className="hover:underline">
              {item.name}
            </Link>
            {item.status !== "ACTIVE" && ` (${LISTING_STATUS_LABELS[item.status].toLowerCase()})`}
          </li>
        ))}
      </ul>

      {/* S2-20 Scenario 6: the bundle is pulled automatically, so the reason
          has to be visible where the owner manages it. */}
      {bundle.status === "UNPUBLISHED" && unavailable.length > 0 && (
        <p role="status" className="mt-3 rounded-lg border-l-2 border-accent bg-accent-soft px-3 py-2 text-sm text-ink">
          Unpublished because {unavailable.map((item) => item.name).join(", ")}{" "}
          {unavailable.length === 1 ? "is" : "are"} no longer published. Republish{" "}
          {unavailable.length === 1 ? "it" : "them"} and this bundle goes back up on its own, or
          edit the bundle to drop {unavailable.length === 1 ? "it" : "them"}.
        </p>
      )}

      <BundleLifecycleActions bundle={bundle} />
      <OwnerBundleBookingList bookings={bookings} />

      {events && events.length > 0 && (
        <details className="mt-4 border-t border-line pt-3 text-xs">
          <summary className="cursor-pointer font-medium uppercase tracking-wide">Bundle history</summary>
          <ul className="mt-2 space-y-1 text-ink-soft">
            {events.map((event) => (
              <li key={event.id}>
                {formatDateTime(event.created_at)} · {BUNDLE_EVENT_LABELS[event.action] ?? event.action}
                {event.listing_name && ` · ${event.listing_name}`}
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}
