"use client";

import { useState } from "react";
import { filterTransactions, formatWalletAmount, type TransactionFilter, type TransactionType, type WalletTransaction } from "@/lib/wallet";
import { formatDateTime } from "@/lib/format";

const labels: Record<TransactionFilter, string> = {
  all: "All",
  topups: "Top-ups",
  escrow: "Escrow holds",
  releases: "Releases",
  withdrawals: "Withdrawals",
  adjustments: "Adjustments",
};

const typeLabels: Record<TransactionType, string> = {
  TOPUP: "TOPUP",
  ESCROW_HOLD: "ESCROW HOLD",
  ESCROW_RELEASE: "RELEASE",
  WITHDRAWAL: "WITHDRAWAL",
  REFUND: "REFUND",
  ADMIN_CREDIT: "ADJUSTMENT",
  ADMIN_DEBIT: "ADJUSTMENT",
};

// A description past this length is long enough to likely wrap past two lines
// in the column's ~290px text width; below it, it renders as plain text with
// no expand control at all.
const LIKELY_TRUNCATED_LENGTH = 80;

function TransactionDescription({ description }: { description: string }) {
  if (description.length <= LIKELY_TRUNCATED_LENGTH) return <p>{description}</p>;
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

export function TransactionHistoryTable({ transactions }: { transactions: WalletTransaction[] }) {
  const [filter, setFilter] = useState<TransactionFilter>("all");
  const rows = filterTransactions(transactions, filter);

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Your activity</p>
          <h2 className="display-caps mt-2 text-xl">Transaction history</h2>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Transaction filters">
          {(Object.keys(labels) as TransactionFilter[]).map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-sm border px-3 py-2 text-xs ${filter === key ? "border-ink bg-ink text-cream" : "border-line bg-white text-ink-soft"}`}
            >
              {labels[key]}
            </button>
          ))}
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="mt-4 border border-line bg-white px-6 py-12 text-center">
          <p className="text-3xl" aria-hidden="true">
            ◎
          </p>
          <p className="display-caps mt-3 text-lg">Nothing here yet</p>
          <p className="body-copy mt-2">Transactions matching this filter will appear here.</p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto border border-line bg-white">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-line bg-sand text-xs uppercase tracking-wider text-ink-soft">
              <tr>
                {["Type", "Description", "Date", "Amount", "Status"].map((head) => (
                  <th key={head} className="px-4 py-3 font-medium">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((tx) => (
                <tr key={tx.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-4">
                    <span className="rounded-sm bg-sand px-2 py-1 text-[10px] font-medium tracking-wider">
                      {typeLabels[tx.type]}
                    </span>
                  </td>
                  <td className="max-w-xs px-4 py-4">
                    <TransactionDescription description={tx.description} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-ink-soft">{formatDateTime(tx.date)}</td>
                  <td
                    className={`whitespace-nowrap px-4 py-4 font-medium ${tx.amountCents >= 0 ? "text-ink" : "text-clay"}`}
                  >
                    {tx.amountCents >= 0 ? "+" : "−"}
                    {formatWalletAmount(Math.abs(tx.amountCents))}
                  </td>
                  <td className="px-4 py-4 text-xs text-ink-soft">{tx.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
