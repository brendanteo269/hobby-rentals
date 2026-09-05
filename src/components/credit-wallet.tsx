"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EMPTY_WALLET, mapWalletResponse, type WalletState } from "@/lib/wallet";
import { BalanceSummaryCard } from "./wallet/balance-summary-card";
import { TopUpModal } from "./wallet/top-up-modal";
import { WithdrawModal } from "./wallet/withdraw-modal";
import { TransactionHistoryTable } from "./wallet/transaction-history-table";

export function CreditWallet() {
  const [wallet, setWallet] = useState<WalletState>(EMPTY_WALLET);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"topup" | "withdraw" | null>(null);
  const [apiError, setApiError] = useState("");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  const refreshWallet = useCallback(async (): Promise<WalletState> => {
    const { data: { session } } = await createClient().auth.getSession();
    if (!session) throw new Error("Please sign in again.");
    const response = await fetch(`${apiUrl}/wallet`, { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load wallet");
    const data = mapWalletResponse(await response.json());
    setWallet(data);
    return data;
  }, [apiUrl]);

  useEffect(() => { const timer = window.setTimeout(() => { refreshWallet().catch(() => setApiError("Wallet data is temporarily unavailable.")).finally(() => setLoading(false)); }, 0); return () => window.clearTimeout(timer); }, [refreshWallet]);

  const openTopUp = () => { setApiError(""); setModal("topup"); };
  const closeModal = () => setModal(null);

  return (
    <section className="space-y-8" aria-labelledby="credit-wallet-heading">
      <div>
        <p className="eyebrow">Money for your rentals</p>
        <h2 id="credit-wallet-heading" className="display-caps mt-2 text-2xl">Credit wallet</h2>
        <p className="body-copy mt-2">Keep credits ready for your next hobby, or withdraw funds you have earned.</p>
      </div>
      {apiError && <p role="alert" className="border-l-2 border-clay bg-sand px-3 py-2 text-sm">{apiError}</p>}
      {loading ? <p role="status">Loading wallet…</p> : apiError ? <p>Wallet balances are unavailable.</p> : <><BalanceSummaryCard wallet={wallet} onOpenTopUp={openTopUp} onOpenWithdraw={() => setModal("withdraw")} /><TransactionHistoryTable transactions={wallet.transactions} /></>}
      {modal === "topup" && <TopUpModal apiUrl={apiUrl} onClose={closeModal} onWalletRefresh={refreshWallet} />}
      {modal === "withdraw" && <WithdrawModal availableCents={wallet.availableCents} onClose={closeModal} onSuccess={(amountCents, destination) => { setWallet((current) => ({ ...current, availableCents: current.availableCents - amountCents, transactions: [{ id: crypto.randomUUID(), type: "WITHDRAWAL", description: `Withdrawal to ${destination}`, amountCents: -amountCents, date: new Date().toISOString(), status: "PENDING" }, ...current.transactions] })); closeModal(); }} />}
    </section>
  );
}
