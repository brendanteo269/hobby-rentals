import { createClient } from "@/lib/supabase/client";

export type TransactionType = "TOPUP" | "ESCROW_HOLD" | "ESCROW_RELEASE" | "WITHDRAWAL" | "REFUND" | "ADMIN_CREDIT" | "ADMIN_DEBIT";
export type TransactionStatus = "COMPLETED" | "PENDING" | "REFUNDED";
export type TransactionFilter = "all" | "topups" | "escrow" | "releases" | "refunds" | "withdrawals" | "adjustments";

export type WalletTransaction = {
  id: string;
  type: TransactionType;
  description: string;
  amountCents: number;
  date: string;
  status: TransactionStatus;
  paymentIntentId?: string;
};

export type WalletState = {
  availableCents: number;
  heldCents: number;
  transactions: WalletTransaction[];
};

export const EMPTY_WALLET: WalletState = { availableCents: 0, heldCents: 0, transactions: [] };

// Mirrors the $10.00 floor enforced by create_wallet_withdrawal in the DB.
export const MIN_WITHDRAWAL_CENTS = 1000;

type WalletApiResponse = {
  available_balance_cents: number;
  held_balance_cents: number;
  transactions: Array<{ id: string; type: TransactionType; description: string; amount_cents: number; created_at: string; status: TransactionStatus; stripe_payment_intent_id?: string }>;
};

export function mapWalletResponse(data: WalletApiResponse): WalletState {
  return {
    availableCents: data.available_balance_cents,
    heldCents: data.held_balance_cents,
    transactions: data.transactions.map((tx) => ({ id: tx.id, type: tx.type, description: tx.description, amountCents: tx.amount_cents, date: tx.created_at, status: tx.status, paymentIntentId: tx.stripe_payment_intent_id })),
  };
}

export function simulateWalletRequest<T>(value: T, delay = 700): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), delay));
}

/** Bearer header for calling the wallet API. Throws if the member's session is missing — every wallet call requires one. */
export async function walletAuthHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await createClient().auth.getSession();
  if (!session) throw new Error("Please sign in again.");
  return { Authorization: `Bearer ${session.access_token}` };
}

export const walletCurrency = new Intl.NumberFormat("en-SG", { style: "currency", currency: "SGD" });
export function formatWalletAmount(cents: number) { return walletCurrency.format(cents / 100); }

export function filterTransactions(transactions: WalletTransaction[], filter: TransactionFilter) {
  if (filter === "all") return transactions;
  if (filter === "topups") return transactions.filter((tx) => tx.type === "TOPUP");
  if (filter === "escrow") return transactions.filter((tx) => tx.type === "ESCROW_HOLD");
  if (filter === "releases") return transactions.filter((tx) => tx.type === "ESCROW_RELEASE");
  if (filter === "refunds") return transactions.filter((tx) => tx.type === "REFUND");
  if (filter === "adjustments") {
    return transactions.filter((tx) => tx.type === "ADMIN_CREDIT" || tx.type === "ADMIN_DEBIT");
  }
  return transactions.filter((tx) => tx.type === "WITHDRAWAL");
}
