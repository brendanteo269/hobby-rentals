import { ExternalLink } from "lucide-react";
import { ImageSlot } from "@/components/ui";
import { substitutionLine } from "@/lib/bundle-items";
import type { BundleAlternative } from "@/lib/bundles";
import { formatMoney } from "@/lib/format";
import { CONDITION_LABELS, LOCATION_LABELS } from "@/lib/listings";

/**
 * S5-10 Scenario 4: the backup that stands in for an item the dates need it for,
 * shown as the listing it is so the renter can open it and decide.
 *
 * "Includes X instead of Y" says what changes; this lets the renter judge whether they are
 * happy with it before asking to book. The link opens a new tab, so the dates and ticks
 * they have chosen here are not lost.
 */
export function BackupListingCard({ itemName, backup }: { itemName: string; backup: BundleAlternative }) {
  const details = [
    backup.brand,
    backup.condition ? CONDITION_LABELS[backup.condition] : null,
    backup.location_area ? LOCATION_LABELS[backup.location_area] : null,
  ].filter(Boolean);

  return (
    <a
      href={`/listings/${backup.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="card mt-2 flex gap-3 overflow-hidden p-0 hover:border-ink"
    >
      <ImageSlot label={backup.name} src={backup.photo_urls?.[0]} className="aspect-square w-24 shrink-0" />
      <span className="min-w-0 flex-1 py-3 pr-3">
        <span className="block text-xs text-ink-soft">{substitutionLine({ item_name: itemName, alternative_name: backup.name })}</span>
        <span className="mt-1 block text-sm font-medium">{backup.name}</span>
        {details.length > 0 && <span className="block text-xs text-ink-soft">{details.join(" · ")}</span>}
        <span className="mt-1 block text-xs text-ink-soft">
          {backup.price_per_day_cents != null && `${formatMoney(backup.price_per_day_cents)} / day on its own`}
          {backup.deposit_cents != null && ` · ${formatMoney(backup.deposit_cents)} deposit`}
        </span>
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium underline underline-offset-2">
          View listing <ExternalLink className="size-3" aria-hidden="true" />
        </span>
      </span>
    </a>
  );
}
