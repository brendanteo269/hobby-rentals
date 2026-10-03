/**
 * The backend's booking states. Which moves between them are allowed, and by
 * whom, is decided by the database (booking_transitions); the UI only offers
 * the moves that table permits.
 */
export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "DECLINED"
  | "CANCELLED"
  | "EXPIRED"
  | "ACTIVE"
  | "COMPLETED";

/** Where the renter's held funds stand; null on bookings made before wallet holds. */
export type PaymentStatus = "HOLD_PLACED" | "HELD_IN_ESCROW" | "RELEASED";

/** One held amount: the rental fee plus platform fee, or the security deposit. */
export type EscrowHold = {
  id: string;
  component: "RENTAL" | "DEPOSIT" | null;
  amount_cents: number;
  status: string;
};

export type Booking = {
  id: string;
  listing_id: string;
  renter_id: string;
  owner_id: string;
  start_date: string;
  end_date: string;
  status: BookingStatus;
  rental_days?: number | null;
  price_per_day_cents?: number | null;
  price_per_week_cents?: number | null;
  rental_subtotal_cents?: number | null;
  platform_fee_bps?: number | null;
  platform_fee_cents?: number | null;
  deposit_cents?: number | null;
  total_amount_cents?: number | null;
  payment_status?: PaymentStatus | null;
  /** Only on responses from creating, replaying or accepting a request. */
  escrow_holds?: EscrowHold[] | null;
  /** True when the server returned an earlier submission of the same attempt. */
  replayed?: boolean | null;
  created_at: string;
  updated_at: string;
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: "Awaiting owner",
  CONFIRMED: "Confirmed",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
  ACTIVE: "In progress",
  COMPLETED: "Completed",
};

/**
 * What a renter can expect next in each state, shown under the booking. The
 * notification for each change carries its own, more specific line; this is
 * the standing explanation for anyone who looks later.
 */
export const BOOKING_STATUS_NEXT_STEP: Record<BookingStatus, string> = {
  PENDING: "The owner will accept or decline. You can withdraw until then.",
  CONFIRMED: "Collect the item on your start date.",
  DECLINED: "Your hold has been released. You can request other dates.",
  CANCELLED: "Your hold has been released.",
  EXPIRED: "The owner did not respond in time. Your hold has been released.",
  ACTIVE: "Return the item by your end date.",
  COMPLETED: "This rental is finished.",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  HOLD_PLACED: "Funds on hold",
  HELD_IN_ESCROW: "Held in escrow",
  RELEASED: "Hold released",
};
