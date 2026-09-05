import Link from "next/link";
import { EmptyState } from "./ui";
import { ROUTES } from "@/lib/routes";
import { formatDate, formatMoney, shortId } from "@/lib/format";
import { walletOwnerLabel, type AdminWallet } from "@/lib/wallets";

/**
 * Search results.
 *
 * Every row links to the wallet rather than expanding in place, matching
 * UserTable: the detail page is where balances and adjustments live.
 */
export function WalletTable({ wallets }: { wallets: AdminWallet[] }) {
  if (wallets.length === 0) {
    return (
      <EmptyState
        title="No matching wallets"
        body="Search by the owner's name, email address, account ID, or the wallet's own ID. Partial matches are fine."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-3xl border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            <th scope="col" className="eyebrow px-6 py-3 font-normal">Wallet</th>
            <th scope="col" className="eyebrow px-6 py-3 font-normal">Available</th>
            <th scope="col" className="eyebrow px-6 py-3 font-normal">Held</th>
            <th scope="col" className="eyebrow px-6 py-3 font-normal">Total</th>
            <th scope="col" className="eyebrow px-6 py-3 font-normal">Created</th>
          </tr>
        </thead>
        <tbody>
          {wallets.map((wallet) => (
            <tr key={wallet.id} className="border-b border-line last:border-0 hover:bg-sand">
              <td className="px-6 py-4">
                <Link href={ROUTES.wallet(wallet.id)} className="block">
                  <span className="font-medium underline-offset-4 hover:underline">
                    {walletOwnerLabel(wallet)}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-soft">
                    {wallet.email ?? "No email"} · {shortId(wallet.id)}
                  </span>
                </Link>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">{formatMoney(wallet.available_balance_cents)}</td>
              <td className="px-6 py-4 whitespace-nowrap">{formatMoney(wallet.held_balance_cents)}</td>
              <td className="px-6 py-4 whitespace-nowrap font-medium">
                {formatMoney(wallet.available_balance_cents + wallet.held_balance_cents)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-ink-soft">{formatDate(wallet.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
