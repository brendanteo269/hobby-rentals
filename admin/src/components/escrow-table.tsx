import Link from "next/link";
import { Badge, EmptyState } from "./ui";
import { ROUTES } from "@/lib/routes";
import { formatDateTime, formatMoney, shortId } from "@/lib/format";
import { holdStateLabel, holdStateTone, type AdminEscrowSummary } from "@/lib/escrow";
import { bookingStatusLabel, bookingStatusTone } from "@/lib/bookings";

/**
 * Search results.
 *
 * Every row links to the escrow record's own page rather than expanding in
 * place - same reasoning as BookingTable. The rental fee and the security
 * deposit get their own columns because the story asks for them to be read
 * apart; damage protection is a third only when the renter bought it.
 */
export function EscrowTable({ records }: { records: AdminEscrowSummary[] }) {
  if (records.length === 0) {
    return (
      <EmptyState
        title="No matching escrow records"
        body="Search by booking ID, listing name, or a renter or owner's name, email or account ID, or narrow by the date the rental was created."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-7xl border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            <th scope="col" className="eyebrow px-6 py-3 font-normal">Rental</th>
            <th scope="col" className="eyebrow px-6 py-3 font-normal">Booking ID</th>
            <th scope="col" className="eyebrow px-6 py-3 font-normal">Escrow</th>
            <th scope="col" className="eyebrow px-6 py-3 font-normal">Booking status</th>
            <th scope="col" className="eyebrow px-6 py-3 font-normal">Renter</th>
            <th scope="col" className="eyebrow px-6 py-3 font-normal">Owner</th>
            <th scope="col" className="eyebrow px-6 py-3 font-normal">Rental fee</th>
            <th scope="col" className="eyebrow px-6 py-3 font-normal">Deposit</th>
            <th scope="col" className="eyebrow px-6 py-3 font-normal">Protection</th>
            <th scope="col" className="eyebrow px-6 py-3 font-normal">Created</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id} className="border-b border-line last:border-0 hover:bg-sand">
              <td className="px-6 py-4">
                <Link href={ROUTES.escrowHold(record.id)} className="font-medium underline-offset-4 hover:underline">
                  {record.subject_name}
                </Link>
                {record.subject_type === "BUNDLE" && <p className="mt-0.5 text-xs text-ink-soft">Bundle</p>}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-ink-soft">
                <Link href={ROUTES.escrowHold(record.id)} className="hover:underline">
                  {shortId(record.id)}
                </Link>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-2">
                  <Badge tone={holdStateTone(record.hold_state)}>{holdStateLabel(record.hold_state)}</Badge>
                  {record.settlement_blocked && <Badge tone="critical">Settlement blocked</Badge>}
                </div>
              </td>
              <td className="px-6 py-4">
                <Badge tone={bookingStatusTone(record.status)}>{bookingStatusLabel(record.status)}</Badge>
              </td>
              <td className="px-6 py-4">
                <Link href={ROUTES.user(record.renter_id)} className="underline-offset-4 hover:underline">
                  {record.renter_display_name ?? record.renter_email ?? "No name"}
                </Link>
              </td>
              <td className="px-6 py-4">
                <Link href={ROUTES.user(record.owner_id)} className="underline-offset-4 hover:underline">
                  {record.owner_display_name ?? record.owner_email ?? "No name"}
                </Link>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">{formatMoney(record.rental_hold_cents)}</td>
              <td className="px-6 py-4 whitespace-nowrap">{formatMoney(record.deposit_hold_cents)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-ink-soft">
                {record.protection_hold_cents > 0 ? formatMoney(record.protection_hold_cents) : "—"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-ink-soft">{formatDateTime(record.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
