import { createClient } from "@/lib/supabase/client";

/**
 * OWNER_PROTECTION_PREMIUM is an owner buying HobbyShield cover.
 * CANCELLATION_FEE is the non-refundable part of a booking the renter
 * cancelled leaving their held balance; CANCELLATION_PAYOUT is the same amount
 * reaching the owner.
 *
 * S3-10 settlement: RENTAL_CHARGE is a returned rental's charges leaving the
 * renter's held balance; RENTAL_PAYOUT is the owner's share, less the platform
 * commission. DAMAGE_DEDUCTION is what the deposit paid towards damage, and
 * DAMAGE_PAYOUT what reached the owner for it. OVERDUE_SETTLEMENT is an
 * overdue return fee, paid from the deposit or later.
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
  | "CANCELLATION_PAYOUT"
  | "OVERDUE_SETTLEMENT"
  | "RENTAL_CHARGE"
  | "RENTAL_PAYOUT"
  | "DAMAGE_DEDUCTION"
  | "DAMAGE_PAYOUT";
/** SETTLED: a hold a rental's settlement consumed. */
export type TransactionStatus = "COMPLETED" | "PENDING" | "REFUNDED" | "SETTLED";

/** What reaches an owner from their rentals, for the earnings page and the wallet's Earnings filter. */
export const EARNING_TYPES: TransactionType[] = ["RENTAL_PAYOUT", "DAMAGE_PAYOUT", "CANCELLATION_PAYOUT"];
export type TransactionFilter = "all" | "topups" | "escrow" | "releases" | "refunds" | "withdrawals" | "adjustments";

export type WalletTransaction = {
  id: string;
  type: TransactionType;
  description: string;
  amountCents: number;
  date: string;
  status: TransactionStatus;
  paymentIntentId?: string;
  hobbyShieldListingId?: string;
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
    metadata?: { listing_id?: string };
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
      hobbyShieldListingId: tx.type === "OWNER_PROTECTION_PREMIUM" ? tx.metadata?.listing_id : undefined,
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
    return transactions.filter(
      (tx) =>
        tx.type === "ESCROW_RELEASE" ||
        EARNING_TYPES.includes(tx.type) ||
        (tx.type === "OVERDUE_SETTLEMENT" && tx.amountCents > 0),
    );
  }
  // A cancellation's refund and its non-refundable part read together; so do
  // a settled rental's charge and any deduction from its deposit.
  if (filter === "refunds") {
    return transactions.filter((tx) =>
      ["REFUND", "CANCELLATION_FEE", "RENTAL_CHARGE", "DAMAGE_DEDUCTION"].includes(tx.type),
    );
  }
  if (filter === "adjustments") {
    return transactions.filter((tx) => tx.type === "ADMIN_CREDIT" || tx.type === "ADMIN_DEBIT");
  }
  return transactions.filter((tx) => tx.type === "WITHDRAWAL");
}
