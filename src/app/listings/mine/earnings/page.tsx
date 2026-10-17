import { ButtonLink, EmptyState } from "@/components/ui";
import { OwnerPortal, requireOwner } from "@/components/owner-portal";
import { backendRequest } from "@/lib/api/client";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { profilePath } from "@/lib/routes";
import { EARNING_TYPES, mapWalletResponse, type TransactionType, type WalletTransaction } from "@/lib/wallet";

export const metadata = { title: "Earnings — HobbyRentals" };

const EARNING_LABELS: Partial<Record<TransactionType, string>> = {
  RENTAL_PAYOUT: "Rental payout",
  DAMAGE_PAYOUT: "Damage compensation",
  CANCELLATION_PAYOUT: "Cancellation payout",
  OVERDUE_SETTLEMENT: "Overdue return fee",
};

function isEarning(tx: WalletTransaction): boolean {
  return EARNING_TYPES.includes(tx.type) || (tx.type === "OVERDUE_SETTLEMENT" && tx.amountCents > 0);
}

/**
 * S3-10: what the owner's rentals have paid them. A returned rental is paid
 * out once its claim window passes with no dispute, less the platform
 * commission; damage compensation and cancellation payouts land here too.
 * Read from the wallet ledger, which is where the money actually went.
 */
export default async function OwnerEarningsPage() {
  await requireOwner();
  const wallet = mapWalletResponse(await backendRequest("/wallet", { cache: "no-store" }));
  const earnings = wallet.transactions.filter(isEarning);
  const total = earnings.reduce((sum, tx) => sum + tx.amountCents, 0);

  return (
    <OwnerPortal active="Earnings" title="Earnings">
      {earnings.length === 0 ? (
        <EmptyState
          title="No earnings yet"
          body="A rental is paid out here once it is returned and its claim window passes with no damage reported."
          action={<ButtonLink href={profilePath("wallet")} variant="outline">Open wallet</ButtonLink>}
        />
      ) : (
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-4 border border-line bg-white p-6">
            <div>
              <p className="eyebrow">Paid to your wallet</p>
              <p className="heading mt-2 text-3xl">{formatMoney(total)}</p>
            </div>
            <ButtonLink href={profilePath("wallet")} variant="outline" className="px-4 py-2 text-xs">
              Open wallet
            </ButtonLink>
          </div>
          <ul className="mt-6 space-y-2">
            {earnings.map((tx) => (
              <li key={tx.id} className="flex flex-wrap items-center justify-between gap-3 border border-line bg-white px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{EARNING_LABELS[tx.type] ?? tx.type}</p>
                  <p className="mt-1 text-ink-soft">{tx.description}</p>
                  {tx.bookingReference && (
                    <p className="mt-1 text-xs text-ink-soft">
                      {tx.bookingReference.name ?? "A rental"} · {formatDate(tx.bookingReference.startDate)} –{" "}
                      {formatDate(tx.bookingReference.endDate)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatMoney(tx.amountCents)}</p>
                  <p className="mt-1 text-xs text-ink-soft">{formatDateTime(tx.date)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </OwnerPortal>
  );
}
