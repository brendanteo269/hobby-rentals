"use client";

import { useCallback, useEffect, useState } from "react";
import { EMPTY_WALLET, mapWalletResponse, walletAuthHeader, type WalletState } from "@/lib/wallet";
import { BalanceSummaryCard } from "./wallet/balance-summary-card";
import { TopUpModal } from "./wallet/top-up-modal";
import { WithdrawModal } from "./wallet/withdraw-modal";
import { TransactionHistoryTable } from "./wallet/transaction-history-table";

export function CreditWallet() {
  const [wallet, setWallet] = useState<WalletState>(EMPTY_WALLET);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"topup" | "withdraw" | null>(null);
  const [apiError, setApiError] = useState("");
  // A transient confirmation, shown after a top-up or withdrawal finishes —
  // the modal closes immediately on success, so without this the balance
  // just changes silently with nothing marking that the action completed.
  const [statusMessage, setStatusMessage] = useState("");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  const refreshWallet = useCallback(async (): Promise<WalletState> => {
    const headers = await walletAuthHeader();
    const response = await fetch(`${apiUrl}/wallet`, { headers, cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load wallet");
    const data = mapWalletResponse(await response.json());
    setWallet(data);
    return data;
  }, [apiUrl]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshWallet()
        .catch(() => setApiError("Wallet data is temporarily unavailable."))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshWallet]);

  // Auto-dismisses like a toast, rather than needing a close button — a
  // confirmation that lingers forever reads as a stuck notification.
  useEffect(() => {
    if (!statusMessage) return;
    const timer = window.setTimeout(() => setStatusMessage(""), 6000);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  const openTopUp = () => {
    setApiError("");
    setModal("topup");
  };
  const closeModal = () => setModal(null);
  const finishWithSuccess = (message: string) => {
    setStatusMessage(message);
    closeModal();
  };

  return (
    <section className="space-y-8" aria-labelledby="credit-wallet-heading">
      <div>
        <p className="eyebrow">Money for your rentals</p>
        <h2 id="credit-wallet-heading" className="display-caps mt-2 text-2xl">
          Credit wallet
        </h2>
        <p className="body-copy mt-2">Keep credits ready for your next hobby, or withdraw funds you have earned.</p>
      </div>
      {apiError && (
        <p role="alert" className="border-l-2 border-clay bg-sand px-3 py-2 text-sm">
          {apiError}
        </p>
      )}
      {statusMessage && (
        <p role="status" className="border-l-2 border-ink bg-sand px-3 py-2 text-sm">
          {statusMessage}
        </p>
      )}
      {loading ? (
        <p role="status">Loading wallet…</p>
      ) : apiError ? (
        <p>Wallet balances are unavailable.</p>
      ) : (
        <>
          <BalanceSummaryCard wallet={wallet} onOpenTopUp={openTopUp} onOpenWithdraw={() => setModal("withdraw")} />
          <TransactionHistoryTable transactions={wallet.transactions} />
        </>
      )}
      {modal === "topup" && (
        <TopUpModal apiUrl={apiUrl} onClose={closeModal} onWalletRefresh={refreshWallet} onSuccess={finishWithSuccess} />
      )}
      {modal === "withdraw" && (
        <WithdrawModal
          apiUrl={apiUrl}
          availableCents={wallet.availableCents}
          onClose={closeModal}
          onWalletRefresh={refreshWallet}
          onSuccess={finishWithSuccess}
        />
      )}
    </section>
  );
}
