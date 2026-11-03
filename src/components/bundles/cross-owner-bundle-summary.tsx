import { MapPin } from "lucide-react";
import { collectionLabel, type BundleTotals } from "@/lib/cross-owner-bundles";
import { formatMoney } from "@/lib/format";

/**
 * The foot of a cross-owner bundle: the combined total (Scenario 1) and how
 * many places the renter must collect from, with how far each is (Scenario 3).
 * Fed by bundleTotals, so it moves with every edit (Scenario 4).
 */
export function CrossOwnerBundleSummary({
  totals,
  itemCount,
  rentalDays,
}: {
  totals: BundleTotals;
  itemCount: number;
  rentalDays: number;
}) {
  const { pickups } = totals;
  return (
    <aside className="card p-5" aria-label="Bundle total">
      <p className="eyebrow">Combined total</p>
      <p className="heading mt-1 text-3xl" aria-live="polite">
        {formatMoney(totals.rentalCents)}
      </p>
      <p className="body-copy mt-1">
        {itemCount} {itemCount === 1 ? "item" : "items"} from {totals.ownerCount} {totals.ownerCount === 1 ? "owner" : "owners"}{" "}
        for {rentalDays} {rentalDays === 1 ? "day" : "days"}
      </p>
      <p className="mt-3 text-sm">
        Deposits: <span className="font-medium">{formatMoney(totals.depositCents)}</span>
      </p>
      <p className="mt-1 text-xs text-ink-soft">Platform fees and deposits are worked out when each item is booked.</p>

      <div className="mt-4 border-t border-line pt-4">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <MapPin className="size-4" aria-hidden="true" />
          {pickups.length === 0
            ? "No pickups yet"
            : `${pickups.length} ${pickups.length === 1 ? "pickup point" : "pickup points"}`}
        </p>
        <ul className="mt-2 space-y-1">
          {pickups.map((pickup) => (
            <li key={pickup.location_area} className="text-xs text-ink-soft">
              {collectionLabel(pickup.location_area, pickup.distance_km)} · {pickup.item_count}{" "}
              {pickup.item_count === 1 ? "item" : "items"}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
