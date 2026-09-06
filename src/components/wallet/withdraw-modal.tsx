"use client";

import { useEffect, useState } from "react";
import { Button, Field } from "../ui";
import { formatWalletAmount, walletAuthHeader, type WalletState } from "@/lib/wallet";
import { WalletDialog } from "./wallet-dialog";

type Props = {
  apiUrl: string;
  availableCents: number;
  onClose: () => void;
  onWalletRefresh: () => Promise<WalletState>;
  onSuccess: (message: string) => void;
};

type PayoutAccount = {
  id: string;
  is_default: boolean;
  instant_eligible: boolean;
} & ({ type: "bank_account"; bank_name: string | null; last4: string | null } | { type: "card"; brand: string | null; last4: string | null });

function payoutAccountLabel(account: PayoutAccount): string {
  if (account.type === "card") return `${account.brand ?? "Card"} •••• ${account.last4 ?? "····"}`;
  return `${account.bank_name ?? "Bank account"} •••• ${account.last4 ?? "····"}`;
}

export function WithdrawModal({ apiUrl, availableCents, onClose, onWalletRefresh, onSuccess }: Props) {
  const [status, setStatus] = useState<"checking" | "needs-setup" | "instant-unavailable" | "ready">("checking");
  // Only accounts eligible for instant payout are ever offered — this app
  // doesn't support the standard (multi-day) payout schedule at all.
  const [eligibleAccounts, setEligibleAccounts] = useState<PayoutAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [amount, setAmount] = useState((availableCents / 100).toFixed(2));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Generated once per mount (one modal open = one withdrawal attempt) and
  // reused across retries of that same attempt, so a double-click or a
  // retry-on-timeout reserves funds only once.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const headers = await walletAuthHeader();
        const [statusResponse, accountsResponse] = await Promise.all([
          fetch(`${apiUrl}/wallet/connect/status`, { headers, cache: "no-store" }),
          fetch(`${apiUrl}/wallet/connect/payout-accounts`, { headers, cache: "no-store" }),
        ]);
        if (!statusResponse.ok || !accountsResponse.ok) throw new Error("Unable to check your payout account.");
        const statusData = (await statusResponse.json()) as { payouts_enabled: boolean };
        const accountsData = (await accountsResponse.json()) as { payout_accounts: PayoutAccount[] };
        if (cancelled) return;
        if (!statusData.payouts_enabled) {
          setStatus("needs-setup");
          return;
        }
        // Cards only — a bank account can technically be instant-eligible too
        // (Stripe's `available_payout_methods` doesn't distinguish), but this
        // app deliberately doesn't offer the bank-account payout method at all.
        const eligible = accountsData.payout_accounts.filter((a) => a.type === "card" && a.instant_eligible);
        setEligibleAccounts(eligible);
        if (eligible.length === 0) {
          setStatus("instant-unavailable");
          return;
        }
        setSelectedAccountId((eligible.find((a) => a.is_default) ?? eligible[0]).id);
        setStatus("ready");
      } catch (caught) {
        if (!cancelled) {
          setStatus("needs-setup");
          setError(caught instanceof Error ? caught.message : "Unable to check your payout account.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiUrl]);

  // Opens Stripe's own hosted Express Dashboard, where the member adds or
  // manages linked cards. We can't do this ourselves: Stripe doesn't let a
  // platform create, update, or delete external accounts via API for any
  // connected account with Express Dashboard access, which is exactly what
  // this "manage" link depends on in the first place.
  async function openPayoutDashboard() {
    setError("");
    try {
      const headers = await walletAuthHeader();
      const response = await fetch(`${apiUrl}/wallet/connect/dashboard-link`, {
        method: "POST",
        headers,
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Unable to open your payout account.");
      const data = (await response.json()) as { url: string };
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to open your payout account.");
    }
  }

  async function startOnboarding() {
    setLoading(true);
    setError("");
    try {
      const headers = await walletAuthHeader();
      const response = await fetch(`${apiUrl}/wallet/connect/onboarding-link`, {
        method: "POST",
        headers,
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Unable to start payout account setup.");
      const data = (await response.json()) as { url: string };
      window.location.href = data.url;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to start payout account setup.");
      setLoading(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const cents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const headers = await walletAuthHeader();
      const response = await fetch(`${apiUrl}/wallet/withdrawals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ amount_cents: cents, idempotency_key: idempotencyKey, payout_account_id: selectedAccountId }),
      });
      const data = (await response.json().catch(() => ({}))) as { detail?: string; status?: string; instant?: boolean };
      if (!response.ok) throw new Error(data.detail ?? "Unable to submit withdrawal.");
      await onWalletRefresh();
      // A Stripe hiccup after funds were already reserved still returns 200
      // with status "PENDING" rather than an error — the withdrawal record
      // exists and reconciliation resolves it, so this isn't a failure, just
      // not yet finished. Separately, "COMPLETED" with instant: false means
      // the transfer succeeded but the instant-payout step itself failed —
      // the money still arrives, just via the standard schedule instead.
      onSuccess(
        data.status !== "COMPLETED"
          ? `Withdrawal of ${formatWalletAmount(cents)} submitted — it'll finish shortly.`
          : data.instant
            ? `Withdrawal of ${formatWalletAmount(cents)} sent instantly.`
            : `Withdrawal of ${formatWalletAmount(cents)} completed — arriving via standard payout instead of instantly.`,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to submit withdrawal.");
    } finally {
      setLoading(false);
    }
  }

  let content: React.ReactNode;
  if (status === "checking") {
    content = (
      <p role="status" className="mt-6 text-sm text-ink-soft">
        Checking your payout account…
      </p>
    );
  } else if (status === "needs-setup") {
    content = (
      <div className="mt-6 space-y-5">
        <div className="border border-line bg-sand p-4">
          <p className="text-sm">You need a linked payout card before you can withdraw funds.</p>
          <p className="body-copy mt-2">Stripe securely collects your card details — HobbyRentals never sees them directly.</p>
        </div>
        {error && (
          <p role="alert" className="text-sm text-clay">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={startOnboarding} disabled={loading}>
            {loading ? "Redirecting…" : "Set up payout card"}
          </Button>
        </div>
      </div>
    );
  } else if (status === "instant-unavailable") {
    content = (
      <div className="mt-6 space-y-5">
        <div className="border border-line bg-sand p-4">
          <p className="text-sm">Instant payout isn&apos;t available for any of your linked accounts.</p>
          <p className="body-copy mt-2">Add an eligible debit card to withdraw.</p>
        </div>
        {error && (
          <p role="alert" className="text-sm text-clay">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={openPayoutDashboard}>Manage cards</Button>
        </div>
      </div>
    );
  } else {
    content = (
      <form className="mt-6 space-y-5" onSubmit={submit}>
        <div className="border border-line bg-sand p-4">
          <p className="eyebrow">Withdrawable now</p>
          <p className="mt-1 text-3xl">{formatWalletAmount(availableCents)}</p>
          <p className="body-copy mt-2">Funds held in escrow stay locked until the related booking is released.</p>
        </div>
        <div>
          <label htmlFor="payout-account" className="block text-sm font-medium">
            Send to
          </label>
          <select
            id="payout-account"
            value={selectedAccountId}
            onChange={(event) => setSelectedAccountId(event.target.value)}
            className="mt-2 w-full rounded-sm border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-ink"
          >
            {eligibleAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {payoutAccountLabel(account)}
                {account.is_default ? " (default)" : ""}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-ink-soft">
            <button type="button" onClick={openPayoutDashboard} className="underline underline-offset-4 hover:text-ink">
              Manage cards
            </button>
          </p>
        </div>
        <Field
          label="Amount"
          id="withdraw-amount"
          type="number"
          min="10"
          max={availableCents / 100}
          step="0.01"
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value);
            setError("");
          }}
          hint="Minimum withdrawal is $10.00."
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
            {loading ? "Submitting…" : "Withdraw instantly"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <WalletDialog title="Withdraw funds" onClose={onClose}>
      {content}
    </WalletDialog>
  );
}
