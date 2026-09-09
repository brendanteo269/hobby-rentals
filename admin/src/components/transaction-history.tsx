import { Badge, EmptyState } from "./ui";
import { formatDateTime, formatMoney, shortId } from "@/lib/format";
import { bookingReferenceFrom, transactionTypeLabel, type WalletTransaction } from "@/lib/wallets";

// A description past this length is long enough to likely wrap past two
// lines in the column's ~350px text width, at which point it's worth
// offering an expand control. There's no server-rendered way to know the
// actual line count, so this is a deliberately conservative estimate: a
// false positive (an expand arrow on text that would have fit) is harmless,
// a false negative (truncated text with no way to see the rest) is not.
const LIKELY_TRUNCATED_LENGTH = 90;

/**
 * A wallet's ledger, newest first.
 *
 * amount_cents is signed, so the sign itself carries the direction — the same
 * convention the member-facing wallet view uses, rather than a separate
 * credit/debit column.
 */
export function TransactionHistory({ transactions }: { transactions: WalletTransaction[] }) {
  if (transactions.length === 0) {
    return (
      <div className="-mx-6 -my-5">
        <EmptyState title="No transactions yet" body="Top-ups, holds, releases, withdrawals, and adjustments will appear here." />
      </div>
    );
  }

  return (
    <div className="-mx-6 -my-5 overflow-x-auto">
      <table className="w-full min-w-3xl border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            <th scope="col" className="eyebrow px-4 py-3 font-normal">Type</th>
            <th scope="col" className="eyebrow px-4 py-3 font-normal">Description</th>
            <th scope="col" className="eyebrow px-4 py-3 font-normal">Booking</th>
            <th scope="col" className="eyebrow px-4 py-3 font-normal">Amount</th>
            <th scope="col" className="eyebrow px-4 py-3 font-normal">Status</th>
            <th scope="col" className="eyebrow px-4 py-3 font-normal">Date</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => {
            const type = transactionTypeLabel(tx.type);
            const bookingId = bookingReferenceFrom(tx.metadata);
            return (
              <tr key={tx.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <Badge tone={type.tone}>{type.label}</Badge>
                </td>
                <td className="max-w-sm px-4 py-3">
                  <TransactionDescription description={tx.description} />
                </td>
                <td className="px-4 py-3 text-ink-soft">{bookingId ? shortId(bookingId) : "—"}</td>
                <td
                  className={`px-4 py-3 whitespace-nowrap font-medium ${tx.amount_cents < 0 ? "text-clay" : "text-ink"}`}
                >
                  {tx.amount_cents >= 0 ? "+" : "−"}
                  {formatMoney(Math.abs(tx.amount_cents))}
                </td>
                <td className="px-4 py-3 text-xs text-ink-soft">{tx.status}</td>
                <td className="px-4 py-3 whitespace-nowrap text-ink-soft">{formatDateTime(tx.created_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * A description that's short enough to fit renders as plain text — no
 * control, nothing to click. Only a likely-truncated one gets the
 * expand/collapse treatment, and its arrow sits in its own flex item beside
 * the (block-level, line-clamped) text rather than relying on <summary>'s
 * native marker, which is what forced the arrow onto its own line before.
 */
function TransactionDescription({ description }: { description: string }) {
  if (description.length <= LIKELY_TRUNCATED_LENGTH) {
    return <p>{description}</p>;
  }

  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-start gap-1.5 [&::-webkit-details-marker]:hidden">
        <span className="line-clamp-2 group-open:line-clamp-none">{description}</span>
        <span
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-[10px] text-ink-soft transition-transform group-open:rotate-90"
        >
          ▶
        </span>
      </summary>
    </details>
  );
}
