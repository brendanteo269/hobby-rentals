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
  const [apiError, setApiError] = useState("");
  // A transient confirmation, shown after a top-up or withdrawal finishes —
  // the modal closes immediately on success, so without this the balance
  // just changes silently with nothing marking that the action completed.
  const [statusMessage, setStatusMessage] = useState("");
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
    <section className="space-y-8" aria-label="Credit wallet">
      {apiError && (
        <p role="alert" className="rounded-lg border-l-2 border-accent bg-accent-soft px-3 py-2 text-sm">
          {apiError}
        </p>
      )}
      {statusMessage && (
        <p role="status" className="rounded-lg border-l-2 border-ink bg-surface-muted px-3 py-2 text-sm">
          {statusMessage}
        </p>
      )}
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
