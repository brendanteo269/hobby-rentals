import type { ReactNode } from "react";
import { formatMoney } from "@/lib/format";
import type { BookingQuote } from "@/lib/bookings";

/** One labelled amount in the breakdown. */
function Row({
  label,
  children,
  divider = false,
  strong = false,
}: {
  label: ReactNode;
  children: ReactNode;
  /** Rule above the row, separating the working from the figures it feeds. */
  divider?: boolean;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 ${divider || strong ? "border-t border-line pt-1" : ""} ${strong ? "font-semibold" : ""}`}
    >
      <dt className={strong ? undefined : "text-ink-soft"}>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/**
 * What a date range costs, itemised: the working, then the rate, subtotal,
 * fee, deposit and total.
 *
 * Shared by the listing and bundle booking screens, which quote the same way
 * and so must show the same breakdown. Showing the working is not decoration:
 * a renter who books six days on a listing priced both ways is charged a full
 * week, and a bare total gives them no way to see it was the cheaper of the
 * two.
 *
 * `subject` only changes the one line that would otherwise read wrong for a
 * set; `extra` is where the bundle adds its own "booked separately" rows.
 */
export function BookingQuoteSummary({
  quote,
  subject = "listing",
  extra,
}: {
  quote: BookingQuote;
  subject?: "listing" | "bundle";
  /** Rendered between the subtotal and the platform fee. */
  extra?: ReactNode;
}) {
  return (
    <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
      {quote.lines.map((line) => (
        <Row
          key={`${line.unit}-${line.count}`}
          label={
            <>
              {line.count} {line.unit}
              {line.count === 1 ? "" : "s"} × {formatMoney(line.rate_cents)}
              {line.capped_from_days && (
                <span className="text-xs">
                  {" "}
                  (for {line.capped_from_days} days —{" "}
                  {quote.price_per_day_cents === null
                    ? `this ${subject} rents by the week`
                    : "cheaper than the daily rate"}
                  )
                </span>
              )}
            </>
          }
        >
          {formatMoney(line.amount_cents)}
        </Row>
      ))}

      <Row divider label={quote.price_per_day_cents === null ? "Weekly rate" : "Daily rate"}>
        {formatMoney(quote.price_per_day_cents ?? quote.price_per_week_cents ?? 0)}
        {quote.price_per_day_cents === null && " / week"}
      </Row>

      <Row label="Rental subtotal">{formatMoney(quote.rental_subtotal_cents)}</Row>
      {extra}
      <Row label="Platform fee">{formatMoney(quote.platform_fee_cents)}</Row>
      {/* S2-09: only once taken. An unselected option is not a charge, and a
          zero row beside real ones reads as a thing you are paying for. */}
      {quote.damage_protection?.selected && (
        <Row label="Damage protection">{formatMoney(quote.damage_protection.fee_cents)}</Row>
      )}
      <Row label="Security deposit">{formatMoney(quote.deposit_cents)}</Row>
      <Row
        strong
        label={
          <>
            Total · {quote.rental_days} {quote.rental_days === 1 ? "day" : "days"}
          </>
        }
      >
        {formatMoney(quote.total_amount_cents)}
      </Row>
    </dl>
  );
}

/** A plain row, for callers adding their own lines through `extra`. */
export function BookingQuoteRow({ label, children }: { label: ReactNode; children: ReactNode }) {
  return <Row label={label}>{children}</Row>;
}
