import { createClient } from "@/lib/supabase/client";

/**
 * OWNER_PROTECTION_PREMIUM is an owner buying HobbyShield cover.
 * CANCELLATION_FEE is the non-refundable part of a booking the renter
 * cancelled leaving their held balance; CANCELLATION_PAYOUT is the same amount
 * reaching the owner.
 */
export type TransactionType =
  | "TOPUP"
  | "ESCROW_HOLD"
  | "ESCROW_RELEASE"
  | "WITHDRAWAL"
  | "REFUND"
  | "ADMIN_CREDIT"
  | "ADMIN_DEBIT"
  | "OWNER_PROTECTION_PREMIUM"
  | "CANCELLATION_FEE"
  | "CANCELLATION_PAYOUT";
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
  /** The booking or bundle booking the money was for; null for a top-up or withdrawal. */
  bookingReference: BookingReference | null;
};

export type BookingReference = {
  bookingId: string | null;
  bundleBookingId: string | null;
  /** The listing's or the bundle's name. */
  name: string | null;
  startDate: string;
  endDate: string;
};

type BookingReferenceResponse = {
  booking_id: string | null;
  bundle_booking_id: string | null;
  name: string | null;
  start_date: string;
  end_date: string;
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
  transactions: Array<{
    id: string;
    type: TransactionType;
    description: string;
    amount_cents: number;
    created_at: string;
    status: TransactionStatus;
    stripe_payment_intent_id?: string;
    booking_reference?: BookingReferenceResponse | null;
  }>;
};

export function mapWalletResponse(data: WalletApiResponse): WalletState {
  return {
    availableCents: data.available_balance_cents,
    heldCents: data.held_balance_cents,
    transactions: data.transactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      description: tx.description,
      amountCents: tx.amount_cents,
      date: tx.created_at,
      status: tx.status,
      paymentIntentId: tx.stripe_payment_intent_id,
      bookingReference: tx.booking_reference
        ? {
            bookingId: tx.booking_reference.booking_id,
            bundleBookingId: tx.booking_reference.bundle_booking_id,
            name: tx.booking_reference.name,
            startDate: tx.booking_reference.start_date,
            endDate: tx.booking_reference.end_date,
          }
        : null,
    })),
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
  if (filter === "releases") {
    return transactions.filter((tx) => tx.type === "ESCROW_RELEASE" || tx.type === "CANCELLATION_PAYOUT");
  }
  // A cancellation's refund and its non-refundable part read together.
  if (filter === "refunds") return transactions.filter((tx) => tx.type === "REFUND" || tx.type === "CANCELLATION_FEE");
  if (filter === "adjustments") {
    return transactions.filter((tx) => tx.type === "ADMIN_CREDIT" || tx.type === "ADMIN_DEBIT");
  }
  return transactions.filter((tx) => tx.type === "WITHDRAWAL");
}
