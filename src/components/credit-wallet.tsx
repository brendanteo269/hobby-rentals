"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { EMPTY_WALLET, mapWalletResponse, walletAuthHeader, type WalletState } from "@/lib/wallet";
import { BalanceSummaryCard } from "./wallet/balance-summary-card";
import { TopUpModal } from "./wallet/top-up-modal";
import { WithdrawModal } from "./wallet/withdraw-modal";
import { TransactionHistoryTable } from "./wallet/transaction-history-table";

export function CreditWallet() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [wallet, setWallet] = useState<WalletState>(EMPTY_WALLET);
  const [loading, setLoading] = useState(true);
  // Opens straight to the withdraw modal when Stripe sends the browser back
  // here after Connect onboarding — read once at mount from the URL rather
  // than set in an effect, so there's no synchronous setState-in-effect.
  const [modal, setModal] = useState<"topup" | "withdraw" | null>(() =>
    searchParams.get("connect") === "return" ? "withdraw" : null,
  );
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

  // "refresh" means the one-time onboarding link expired mid-flow; Stripe's
  // own docs require regenerating a fresh one rather than retrying the dead
  // link. Clearing the query param and the "refresh" redirect are both
  // browser/navigation actions, not component state, so this effect never
  // calls setState itself — the "return" case is handled above instead.
  useEffect(() => {
    const connect = searchParams.get("connect");
    if (!connect) return;
    router.replace(
      (window.location.pathname + window.location.search.replace(/[?&]connect=[^&]*/, "")) as Route,
      { scroll: false },
    );
    if (connect !== "refresh") return;
    (async () => {
      try {
        const headers = await walletAuthHeader();
        const response = await fetch(`${apiUrl}/wallet/connect/onboarding-link`, { method: "POST", headers });
        if (!response.ok) return;
        const data = (await response.json()) as { url: string };
        window.location.href = data.url;
      } catch {
        // No session, or the request failed — the member can retry manually
        // from the withdraw modal.
      }
    })();
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
