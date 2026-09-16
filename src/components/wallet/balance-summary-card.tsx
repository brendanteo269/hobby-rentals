import { Button } from "../ui";
import { formatWalletAmount, MIN_WITHDRAWAL_CENTS, type WalletState } from "@/lib/wallet";

export function BalanceSummaryCard({
  wallet,
  onOpenTopUp,
  onOpenWithdraw,
}: {
  wallet: WalletState;
  onOpenTopUp: () => void;
  onOpenWithdraw: () => void;
}) {
  const belowMinimum = wallet.availableCents < MIN_WITHDRAWAL_CENTS;
  return (
    <div className="rounded-2xl border border-line bg-white p-6 sm:p-8">
      <div className="grid gap-6 sm:grid-cols-3">
        <Metric
          label="Available balance"
          valueCents={wallet.availableCents}
          note="Spendable or eligible for withdrawal"
        />
        <Metric
          label="Held in escrow"
          valueCents={wallet.heldCents}
          note="Temporarily locked for active bookings"
          escrow
        />
        <Metric
          label="Total balance"
          valueCents={wallet.availableCents + wallet.heldCents}
          note="Available plus escrow"
        />
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <Button onClick={onOpenTopUp}>Top up credits</Button>
        <Button
          variant="outline"
          onClick={onOpenWithdraw}
          disabled={belowMinimum}
          title={belowMinimum ? `You need at least ${formatWalletAmount(MIN_WITHDRAWAL_CENTS)} available to withdraw.` : undefined}
        >
          Withdraw funds
        </Button>
        {belowMinimum && (
          <p className="body-copy text-xs text-ink-soft">
            Minimum withdrawal is {formatWalletAmount(MIN_WITHDRAWAL_CENTS)}.
          </p>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  valueCents,
  note,
  escrow,
}: {
  label: string;
  valueCents: number;
  note: string;
  escrow?: boolean;
}) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="mt-2 text-2xl font-medium">{formatWalletAmount(valueCents)}</p>
      <p className="body-copy mt-1">
        {escrow ? "🔒 " : ""}
        {note}
      </p>
    </div>
  );
}
