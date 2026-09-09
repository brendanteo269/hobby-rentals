import { createAdminClient } from "@/lib/supabase/admin";
import type { StatusTone } from "@/lib/users";

/**
 * A wallet as an administrator sees it: identity from auth.users/profiles,
 * balances from wallets. Mirrors the row shape of admin_search_wallets and
 * admin_get_wallet, which is why both exist — one type serves the list and
 * the detail page.
 */
export type AdminWallet = {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  available_balance_cents: number;
  held_balance_cents: number;
  created_at: string;
};

type WalletSearchRow = AdminWallet & { total_count: number };

export const PAGE_SIZE = 25;

export type WalletSearchResult = {
  wallets: AdminWallet[];
  total: number;
  /** Null when the search succeeded. Surfaced rather than thrown so the page can stay up. */
  error: string | null;
};

/**
 * Finds wallets by the owner's display name, email address, account id, or
 * the wallet's own id.
 *
 * Call only behind requirePortalSession(): the client used here carries the
 * secret key and so satisfies admin_search_wallets's authorisation check
 * unconditionally.
 */
export async function searchWallets(query: string, page = 1): Promise<WalletSearchResult> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("admin_search_wallets", {
    search: query,
    result_limit: PAGE_SIZE,
    result_offset: (page - 1) * PAGE_SIZE,
  });

  if (error) {
    console.error("Wallet search failed:", error.message);
    return { wallets: [], total: 0, error: "Could not load wallets." };
  }

  const rows = (data ?? []) as WalletSearchRow[];

  return {
    total: rows[0]?.total_count ?? 0,
    wallets: rows,
    error: null,
  };
}

/** One wallet by id, or null when no such wallet exists. */
export async function getWallet(id: string): Promise<AdminWallet | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("admin_get_wallet", { target_wallet_id: id });

  if (error) {
    console.error("Wallet lookup failed:", error.message);
    return null;
  }

  const rows = (data ?? []) as AdminWallet[];
  return rows[0] ?? null;
}

/** Mirrors the wallet_transactions.type check constraint. */
export type TransactionType =
  | "TOPUP"
  | "ESCROW_HOLD"
  | "ESCROW_RELEASE"
  | "WITHDRAWAL"
  | "REFUND"
  | "ADMIN_CREDIT"
  | "ADMIN_DEBIT";

/** amount_cents is signed: positive for a credit, negative for a debit. */
export type WalletTransaction = {
  id: string;
  type: TransactionType;
  amount_cents: number;
  description: string;
  status: string;
  currency: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

type TransactionRow = WalletTransaction & { total_count: number };

export type TransactionSearchResult = {
  transactions: WalletTransaction[];
  total: number;
  error: string | null;
};

/** Smaller than the wallet list's PAGE_SIZE: a ledger is read a few entries at a time, not browsed like a directory. */
export const TRANSACTION_PAGE_SIZE = 10;

/**
 * One wallet's transaction history, newest first.
 *
 * search matches the description text; typeFilter narrows to one exact
 * TransactionType. Both are optional and combine — same shape as
 * searchWallets, but scoped to one wallet's own ledger.
 */
export async function getWalletTransactions(
  walletId: string,
  page = 1,
  search = "",
  typeFilter: TransactionType | "" = "",
): Promise<TransactionSearchResult> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("admin_get_wallet_transactions", {
    target_wallet_id: walletId,
    search,
    type_filter: typeFilter,
    result_limit: TRANSACTION_PAGE_SIZE,
    result_offset: (page - 1) * TRANSACTION_PAGE_SIZE,
  });

  if (error) {
    console.error("Transaction history load failed:", error.message);
    return { transactions: [], total: 0, error: "Could not load transaction history." };
  }

  const rows = (data ?? []) as TransactionRow[];

  return {
    total: rows[0]?.total_count ?? 0,
    transactions: rows,
    error: null,
  };
}

// Derived state -------------------------------------------------------------

const typeLabels: Record<TransactionType, { label: string; tone: StatusTone }> = {
  TOPUP: { label: "Top-up", tone: "positive" },
  ESCROW_HOLD: { label: "Escrow hold", tone: "warning" },
  ESCROW_RELEASE: { label: "Escrow release", tone: "positive" },
  WITHDRAWAL: { label: "Withdrawal", tone: "neutral" },
  REFUND: { label: "Refund", tone: "positive" },
  ADMIN_CREDIT: { label: "Manual credit", tone: "critical" },
  ADMIN_DEBIT: { label: "Manual debit", tone: "critical" },
};

/** Every known type, in the same order as typeLabels, for populating a type filter. */
export const TRANSACTION_TYPES = Object.keys(typeLabels) as TransactionType[];

/** Display label and Badge tone for a transaction type. */
export function transactionTypeLabel(type: TransactionType): { label: string; tone: StatusTone } {
  return typeLabels[type];
}

/**
 * A booking reference, when the transaction carries one.
 *
 * There is no booking_id column on wallet_transactions yet, so this lives in
 * metadata — read defensively rather than assuming the key is always there.
 */
export function bookingReferenceFrom(metadata: Record<string, unknown>): string | null {
  const value = metadata?.booking_id;
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Best available name for a wallet's owner, for headings and form summaries. */
export function walletOwnerLabel(wallet: Pick<AdminWallet, "display_name" | "email">): string {
  return wallet.display_name ?? wallet.email ?? "Unnamed account";
}
