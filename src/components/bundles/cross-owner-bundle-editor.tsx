"use client";

import { useEffect, useState } from "react";
import {
  addListing,
  bundleTotals,
  editableItems,
  pickedListingIds,
  removeItem,
  swapItem,
  type CrossOwnerBundle,
  type EditableItem,
} from "@/lib/cross-owner-bundles";
import { CrossOwnerBundleAddItem } from "./cross-owner-bundle-add-item";
import { CrossOwnerBundleItemRow } from "./cross-owner-bundle-item-row";
import { CrossOwnerBundleSummary } from "./cross-owner-bundle-summary";

/**
 * A suggested cross-owner bundle the renter can edit (Scenario 4). The edits
 * are held here and the totals recomputed from them on every render, so the
 * total updates straight away with no round trip. Rebuilding replaces the
 * whole editor (the caller keys it), which is what discards the old edits.
 *
 * `initialItems` resumes an earlier edit, and `onItemsChange` hears every
 * state the items reach (the first one included) so the caller can keep them.
 */
export function CrossOwnerBundleEditor({
  bundle,
  origin,
  initialItems,
  onItemsChange,
}: {
  bundle: CrossOwnerBundle;
  origin?: { lat: number; lng: number };
  initialItems?: EditableItem[];
  onItemsChange?: (items: EditableItem[]) => void;
}) {
  const [items, setItems] = useState(() => initialItems ?? editableItems(bundle.items));
  useEffect(() => onItemsChange?.(items), [items, onItemsChange]);
  const totals = bundleTotals(items);
  const pickedCount = items.filter((item) => item.selected).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-4">
        {items.length === 0 ? (
          <p className="card body-copy p-6">Every item has been removed. Search below to add one.</p>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => (
              <CrossOwnerBundleItemRow
                key={item.id}
                item={item}
                onRemove={(itemId) => setItems((current) => removeItem(current, itemId))}
                onSwap={(itemId, listingId) => setItems((current) => swapItem(current, itemId, listingId))}
              />
            ))}
          </ul>
        )}
        <CrossOwnerBundleAddItem
          startDate={bundle.start_date}
          endDate={bundle.end_date}
          origin={origin}
          pickedIds={pickedListingIds(items)}
          onAdd={(listing) => setItems((current) => addListing(current, listing))}
        />
      </div>
      <div className="lg:sticky lg:top-24 lg:self-start">
        <CrossOwnerBundleSummary totals={totals} itemCount={pickedCount} rentalDays={bundle.rental_days} />
      </div>
    </div>
  );
}
