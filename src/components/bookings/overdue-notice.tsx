import { Badge } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { daysOverdue, overdueFeeCents } from "@/lib/overdue";
import type { Booking } from "@/lib/bookings";

/**
 * S3-18 Scenario 2: the late fee a rental has run up, shown to both parties.
 *
 * A server component with no state of its own, so it drops into the renter's
 * list and the owner's alike. Renders nothing for a rental that was returned
 * on time, which is most of them.
 *
 * The wording differs by side only in who is owed: the owner is told what
 * they will be paid, the renter what they are being charged.
 */
export function OverdueNotice({ booking, side }: { booking: Booking; side: "renter" | "owner" }) {
  const fee = overdueFeeCents(booking);
  if (fee === null) return null;

  const late = booking.overdue_since;
  const days = daysOverdue(booking);
  const arrears = booking.overdue_arrears_cents ?? 0;

  return (
    <p className="mt-1 text-sm text-accent-dark">
      {late ? (
        <>
          <Badge variant="dark" className="mr-2 align-middle">Overdue</Badge>
          {days} {days === 1 ? "day" : "days"} past the {formatDate(booking.end_date)} return date
          {fee > 0 && ` · ${formatMoney(fee)} in late fees so far`}
          {side === "renter" && booking.overdue_daily_rate_cents
            ? `, growing by ${formatMoney(booking.overdue_daily_rate_cents)} a day`
            : ""}
          .
        </>
      ) : (
        <>
          Returned late · {formatMoney(fee)} in late fees
          {side === "owner"
            ? " added to your settlement."
            : arrears > 0
              ? ` — ${formatMoney(arrears)} of it is still owed beyond your deposit.`
              : " was taken from your deposit."}
        </>
      )}
    </p>
  );
}
