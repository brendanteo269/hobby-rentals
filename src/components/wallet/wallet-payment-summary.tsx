import { ButtonLink } from "@/components/ui";
import { formatMoney } from "@/lib/format";

/**
 * The "paid from your wallet" panel for an immediate wallet purchase
 * (HobbyShield, listing promotion): the charge, the available balance, and -
 * when it falls short - the shortfall with a link to top up.
 */
export function WalletPaymentSummary({ amountCents, availableCents, chargeLabel, productName }: { amountCents: number; availableCents: number; chargeLabel: string; productName: string }) {
  const shortfall = Math.max(0, amountCents - availableCents);
  const covered = shortfall === 0;
  return (
    <>
      <div className={`mt-5 border-l-4 px-4 py-4 text-sm ${covered ? "border-success bg-success-soft" : "border-accent bg-accent-soft"}`}>
        <p className="font-medium">Paid from your wallet</p>
        <p className={`mt-2 text-lg font-semibold ${covered ? "text-success" : "text-accent-dark"}`}>Available now: {formatMoney(availableCents)}</p>
        {covered ? <p className="mt-1 text-xs text-success">Your available balance covers this {chargeLabel}.</p> : <p className="mt-1 text-xs text-accent-dark">Short by {formatMoney(shortfall)}. Add funds before buying {productName}.</p>}
      </div>
      {!covered && <div className="mt-4"><ButtonLink href="/profile?view=wallet" variant="accent" className="px-4 py-2 text-xs">Add wallet funds</ButtonLink></div>}
    </>
  );
}
