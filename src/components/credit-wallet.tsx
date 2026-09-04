"use client";

import { useState } from "react";
import { INITIAL_WALLET, type WalletState } from "@/lib/wallet";
import { BalanceSummaryCard } from "./wallet/balance-summary-card";
import { TopUpModal } from "./wallet/top-up-modal";
import { WithdrawModal } from "./wallet/withdraw-modal";
import { TransactionHistoryTable } from "./wallet/transaction-history-table";

export function CreditWallet() {
  const [wallet, setWallet] = useState<WalletState>(INITIAL_WALLET);
  const [modal, setModal] = useState<"topup" | "withdraw" | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const openTopUp = () => {
    setClientSecret(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? "mock_client_secret_until_backend" : null);
    setModal("topup");
  };
  const closeModal = () => { setModal(null); setClientSecret(null); };

  return (
    <section className="space-y-8" aria-labelledby="credit-wallet-heading">
      <div>
        <p className="eyebrow">Money for your rentals</p>
        <h2 id="credit-wallet-heading" className="display-caps mt-2 text-2xl">Credit wallet</h2>
        <p className="body-copy mt-2">Keep credits ready for your next hobby, or withdraw funds you have earned.</p>
      </div>
      <BalanceSummaryCard wallet={wallet} onOpenTopUp={openTopUp} onOpenWithdraw={() => setModal("withdraw")} />
      <TransactionHistoryTable transactions={wallet.transactions} />
      {modal === "topup" && <TopUpModal clientSecret={clientSecret} onClose={closeModal} onSuccess={(amountCents) => { setWallet((current) => ({ ...current, availableCents: current.availableCents + amountCents, transactions: [{ id: crypto.randomUUID(), type: "TOPUP", description: "Credit top-up via card ending in 4242", amountCents, date: new Date().toISOString(), status: "COMPLETED" }, ...current.transactions] })); closeModal(); }} />}
      {modal === "withdraw" && <WithdrawModal availableCents={wallet.availableCents} onClose={closeModal} onSuccess={(amountCents, destination) => { setWallet((current) => ({ ...current, availableCents: current.availableCents - amountCents, transactions: [{ id: crypto.randomUUID(), type: "WITHDRAWAL", description: `Withdrawal to ${destination}`, amountCents: -amountCents, date: new Date().toISOString(), status: "PENDING" }, ...current.transactions] })); closeModal(); }} />}
    </section>
  );
}
