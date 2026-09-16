"use client";

import { useCallback, useEffect, useState } from "react";
import { EMPTY_WALLET, mapWalletResponse, walletAuthHeader, type WalletState } from "@/lib/wallet";
import { BalanceSummaryCard } from "./wallet/balance-summary-card";
import { TopUpModal } from "./wallet/top-up-modal";
import { WithdrawModal } from "./wallet/withdraw-modal";
import { TransactionHistoryTable } from "./wallet/transaction-history-table";
import { useToast } from "./toast";

export function CreditWallet() {
  const [wallet, setWallet] = useState<WalletState>(EMPTY_WALLET);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"topup" | "withdraw" | null>(null);
  // Gates the "balances unavailable" fallback content below — persistent,
  // unlike a toast, since the section stays in this state until reloaded.
  const [apiError, setApiError] = useState("");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const { show, dismiss } = useToast();

  const refreshWallet = useCallback(async (): Promise<WalletState> => {
    const headers = await walletAuthHeader();
    const response = await fetch(`${apiUrl}/wallet`, { headers, cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load wallet");
    const data = mapWalletResponse(await response.json());
    setWallet(data);
    return data;
  }, [apiUrl]);

  useEffect(() => {
    const loadingToast = show("Loading wallet…", "loading");
    const timer = window.setTimeout(() => {
      refreshWallet()
        .catch(() => setApiError("Wallet data is temporarily unavailable."))
        .finally(() => {
          setLoading(false);
          dismiss(loadingToast);
        });
    }, 0);
    // Strict Mode's dev-only mount→cleanup→mount cycle runs this effect body
    // twice; the first pass's `show` already added a real toast before its
    // timer is cancelled, so the cleanup must dismiss it too — otherwise that
    // trial run's toast is never removed and lingers forever.
    return () => {
      window.clearTimeout(timer);
      dismiss(loadingToast);
    };
    // Runs once on mount — refreshWallet, show and dismiss are all stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openTopUp = () => {
    setApiError("");
    setModal("topup");
  };
  const closeModal = () => setModal(null);
  const finishWithSuccess = (message: string) => {
    show(message, "success");
    closeModal();
  };

  return (
    <section className="space-y-8" aria-label="Credit wallet">
      {loading ? null : apiError ? (
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
