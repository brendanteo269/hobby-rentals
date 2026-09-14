"use client";

import { useState } from "react";
import { Button, Field } from "../ui";
import { MIN_WITHDRAWAL_CENTS, formatWalletAmount, walletAuthHeader, type WalletState } from "@/lib/wallet";
import { WalletDialog } from "./wallet-dialog";

type Props = {
  apiUrl: string;
  availableCents: number;
  onClose: () => void;
  onWalletRefresh: () => Promise<WalletState>;
  onSuccess: (message: string) => void;
};

// Withdrawal is simulated, not integrated with a real payout gateway — the
// backend reserves the amount and records the withdrawal atomically, and
// this modal's job stops there too. There is no real bank/card linking to
// check or manage.
export function WithdrawModal({ apiUrl, availableCents, onClose, onWalletRefresh, onSuccess }: Props) {
  const [amount, setAmount] = useState((availableCents / 100).toFixed(2));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Generated once per mount (one modal open = one withdrawal attempt) and
  // reused across retries of that same attempt, so a double-click or a
  // retry-on-timeout reserves funds only once.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const cents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (cents < MIN_WITHDRAWAL_CENTS) {
      setError(`Minimum withdrawal is ${formatWalletAmount(MIN_WITHDRAWAL_CENTS)}.`);
      return;
    }
    if (cents > availableCents) {
      setError(`Amount exceeds your available balance of ${formatWalletAmount(availableCents)}.`);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const headers = await walletAuthHeader();
      const response = await fetch(`${apiUrl}/wallet/withdrawals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ amount_cents: cents, idempotency_key: idempotencyKey }),
      });
      const data = (await response.json().catch(() => ({}))) as { detail?: string };
      if (!response.ok) throw new Error(data.detail ?? "Unable to submit withdrawal.");
      // The withdrawal has already succeeded server-side at this point (funds
      // deducted, record created) — a refresh failure here is a stale-balance
      // problem, not a failed withdrawal, so it must not land in the catch
      // below. Reporting it as a submit failure would risk a real double
      // withdrawal: the user would see "failed", reopen the modal, get a
      // fresh idempotency key, and resubmit.
      try {
        await onWalletRefresh();
      } catch {
        // Wallet view will catch up next time it loads.
      }
      onSuccess(`Withdrawal of ${formatWalletAmount(cents)} submitted — funds will be transferred to your linked bank account.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to submit withdrawal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <WalletDialog title="Withdraw funds" onClose={onClose}>
      {/* noValidate: min/max below double as a11y/spinner hints, but max is
          derived from the balance and can end up below min (balance under
          the withdrawal minimum) — native validation would then silently
          block submission before our onSubmit ever runs, hiding the clear
          in-app error this form is supposed to show. */}
      <form className="mt-6 space-y-5" onSubmit={submit} noValidate>
        <div className="border border-line bg-sand p-4">
          <p className="eyebrow">Withdrawable now</p>
          <p className="mt-1 text-3xl">{formatWalletAmount(availableCents)}</p>
          <p className="body-copy mt-2">Funds held in escrow stay locked until the related booking is released.</p>
        </div>
        <Field
          label="Amount"
          id="withdraw-amount"
          type="number"
          min={MIN_WITHDRAWAL_CENTS / 100}
          max={availableCents / 100}
          step="0.01"
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value);
            setError("");
          }}
          hint={`Minimum withdrawal is ${formatWalletAmount(MIN_WITHDRAWAL_CENTS)}.`}
        />
        {loading && (
          <p role="status" className="text-sm text-ink-soft">
            Submitting your withdrawal…
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-clay">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Submitting…" : "Withdraw funds"}
          </Button>
        </div>
      </form>
    </WalletDialog>
  );
}
