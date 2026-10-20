import { Panel } from "./ui";
import { formatDateTime } from "@/lib/format";
import type { HandoverDetails } from "@/lib/bookings";

/**
 * Where a booking's handover stands (S3-02): who has confirmed, and the
 * renter's pickup photos - what an administrator needs before starting or
 * cancelling a booking flagged for an unconfirmed handover.
 */
export function HandoverDetailsPanel({ details }: { details: HandoverDetails }) {
  const photosDone = details.pickup_inspection_status === "COMPLETED";
  return (
    <Panel title="Handover" description="The renter and the owner each confirm the handover; the renter's pickup photos come first.">
      <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="eyebrow">Renter confirmed</dt>
          <dd className="mt-1.5">{formatDateTime(details.renter_confirmed_at, "Not yet")}</dd>
        </div>
        <div>
          <dt className="eyebrow">Owner confirmed</dt>
          <dd className="mt-1.5">{formatDateTime(details.owner_confirmed_at, "Not yet")}</dd>
        </div>
        <div>
          <dt className="eyebrow">Pickup photos</dt>
          <dd className="mt-1.5">
            {photosDone
              ? `Complete, ${formatDateTime(details.pickup_completed_at)}`
              : details.pickup_inspection_status === "IN_PROGRESS"
                ? "Started, not finished"
                : "Not taken"}
          </dd>
        </div>
        {details.flagged_at && (
          <div>
            <dt className="eyebrow">Flagged for attention</dt>
            <dd className="mt-1.5">{formatDateTime(details.flagged_at)}</dd>
          </div>
        )}
      </dl>

      {details.pickup_photos.length > 0 && (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {details.pickup_photos.map((photo) => (
            <li key={photo.angle}>
              <a href={photo.photo_url} target="_blank" rel="noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element -- a short-lived signed URL */}
                <img
                  src={photo.photo_url}
                  alt={`${photo.label} pickup photo`}
                  className="aspect-square w-full border border-line object-cover"
                />
              </a>
              <p className="mt-1 text-xs text-ink-soft">{photo.label}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
