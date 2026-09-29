import { formatDateTime } from "@/lib/format";
import { PASSPORT_ENTRY_LABELS, PASSPORT_PHOTO_LABELS, type PassportEntry } from "@/lib/listings";

/**
 * The passport's history, newest first, shared by the owner's passport page
 * and (S2-07) the renter's view of a listing. Read-only by design: the ledger
 * is append-only, so there is nothing here to edit or delete.
 */
export function PassportTimeline({ entries }: { entries: PassportEntry[] }) {
  if (entries.length === 0) {
    return <p className="body-copy">No condition records yet.</p>;
  }

  return (
    <ol className="space-y-6 border-l border-line pl-6">
      {entries.map((entry) => (
        <li key={entry.id} className="relative">
          <span aria-hidden="true" className="absolute -left-[1.8rem] top-1.5 size-2.5 rounded-full bg-ink" />
          <p className="text-sm font-semibold">{PASSPORT_ENTRY_LABELS[entry.entry_type] ?? entry.entry_type}</p>
          <p className="text-xs text-ink-soft">
            <time dateTime={entry.created_at}>{formatDateTime(entry.created_at)}</time>
          </p>

          {Object.keys(entry.photo_urls).length > 0 && (
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(entry.photo_urls).map(([name, url]) => {
                const label = PASSPORT_PHOTO_LABELS[name] ?? name;
                return (
                  <li key={name}>
                    <a href={url} target="_blank" rel="noreferrer" className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element -- S3 URL, possibly short-lived presigned */}
                      <img src={url} alt={label} className="aspect-square w-full border border-line object-cover" />
                    </a>
                    <p className="mt-1 text-xs text-ink-soft">{label}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}
