import { Button } from "../ui";
import { formatWalletAmount, type WalletState } from "@/lib/wallet";

export function BalanceSummaryCard({ wallet, onOpenTopUp, onOpenWithdraw }: { wallet: WalletState; onOpenTopUp: () => void; onOpenWithdraw: () => void }) {
  return <div className="border border-line bg-white p-6 sm:p-8">
    <div className="grid gap-6 sm:grid-cols-3">
      <Metric label="Available balance" valueCents={wallet.availableCents} note="Spendable or eligible for withdrawal" />
      <Metric label="Held in escrow" valueCents={wallet.heldCents} note="Temporarily locked for active bookings" escrow />
      <Metric label="Total balance" valueCents={wallet.availableCents + wallet.heldCents} note="Available plus escrow" />
    </div>
    <div className="mt-8 flex flex-wrap gap-3 border-t border-line pt-6"><Button onClick={onOpenTopUp}>Top up credits</Button><Button variant="outline" onClick={onOpenWithdraw}>Withdraw funds</Button></div>
  </div>;
}
function Metric({ label, valueCents, note, escrow }: { label: string; valueCents: number; note: string; escrow?: boolean }) { return <div><p className="eyebrow">{label}</p><p className="mt-2 text-2xl font-medium">{formatWalletAmount(valueCents)}</p><p className="body-copy mt-1">{escrow ? "🔒 " : ""}{note}</p></div>; }
