import { Trash2 } from "lucide-react";
import { formatMoney } from "@/lib/format";
import type { EditableItem } from "@/lib/cross-owner-bundles";
import { CrossOwnerListingLine } from "./cross-owner-listing-line";

/**
 * One kind of gear in a cross-owner bundle: why it was picked (Scenario 5),
 * the pick, and the controls to remove it or swap it for an alternative
 * (Scenario 4). An item with no pick shows why instead (Scenarios 2 and 6)
 * and can still be dismissed.
 */
export function CrossOwnerBundleItemRow({
  item,
  onRemove,
  onSwap,
}: {
  item: EditableItem;
  onRemove: (itemId: string) => void;
  onSwap: (itemId: string, listingId: string) => void;
}) {
  const { selected, alternatives } = item;
  return (
    <li className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">{item.need}</p>
          {item.reason && <p className="body-copy mt-1">{item.reason}</p>}
        </div>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          aria-label={`Remove ${item.need}`}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-surface-muted"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>

      {selected ? (
        <div className="mt-3 border-t border-line pt-3">
          <CrossOwnerListingLine listing={selected} />
        </div>
      ) : (
        <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2 text-sm text-ink-soft">{item.note}</p>
      )}

      {selected && alternatives.length > 0 && (
        <details className="mt-3 border-t border-line pt-3">
          <summary className="cursor-pointer text-sm font-medium">
            Swap · {alternatives.length} {alternatives.length === 1 ? "alternative" : "alternatives"}
          </summary>
          <ul className="mt-3 space-y-4">
            {alternatives.map((listing) => (
              <li key={listing.id}>
                <CrossOwnerListingLine listing={listing}>
                  <PriceChange from={selected.rental_subtotal_cents} to={listing.rental_subtotal_cents} />
                  <button
                    type="button"
                    onClick={() => onSwap(item.id, listing.id)}
                    className="mt-1 min-h-11 rounded-full border border-line px-4 text-sm font-medium hover:bg-surface-muted"
                  >
                    Use this
                  </button>
                </CrossOwnerListingLine>
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}

/** How much dearer or cheaper a swap makes the bundle, so the renter sees the effect before choosing. */
function PriceChange({ from, to }: { from: number; to: number }) {
  const difference = to - from;
  if (difference === 0) return <p className="text-xs text-ink-soft">Same price</p>;
  return (
    <p className="text-xs text-ink-soft">
      {difference > 0 ? "+" : "−"}
      {formatMoney(Math.abs(difference))}
    </p>
  );
}
