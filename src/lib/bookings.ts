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
  /** When an unanswered request lapses; set on every request. */
  respond_by?: string | null;
  decline_reason?: DeclineReason | null;
  decline_note?: string | null;
  /** Only on responses from creating, replaying or accepting a request. */
  escrow_holds?: EscrowHold[] | null;
  /** True when the server returned an earlier submission of the same attempt. */
  replayed?: boolean | null;
  created_at: string;
  updated_at: string;
};

/** One line of the working: "2 weeks x $100.00 = $200.00". */
export type BookingQuoteLine = {
  count: number;
  unit: "day" | "week";
  rate_cents: number;
  amount_cents: number;
  /**
   * Set when a whole week is charged for fewer than seven days, because the
   * daily rate would have cost more. Without saying so, a renter reading
   * "1 week" against a five-day booking would think it a mistake.
   */
  capped_from_days?: number | null;
};

/**
 * What a date range costs, itemised. Lives here rather than in
 * @/lib/api/bookings so client components can read it - the bundle quote is
 * this shape too, which is what lets one component render both.
 */
export type BookingQuote = {
  rental_days: number;
  price_per_day_cents: number | null;
  price_per_week_cents: number | null;
  lines: BookingQuoteLine[];
  rental_subtotal_cents: number;
  platform_fee_bps: number;
  platform_fee_cents: number;
  deposit_cents: number;
  total_amount_cents: number;
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

/** The same for a bundle booking, which is decided whole and cannot be withdrawn. */
export const BUNDLE_STATUS_NEXT_STEP: Record<BookingStatus, string> = {
  ...BOOKING_STATUS_NEXT_STEP,
  PENDING: "The owner will accept or decline the whole bundle.",
  CONFIRMED: "Collect the items on your start date.",
  ACTIVE: "Return the items by your end date.",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  HOLD_PLACED: "Funds on hold",
  HELD_IN_ESCROW: "Held in escrow",
  RELEASED: "Hold released",
};

/** Badge colour for a booking's status - confirmed/active read as the "it's happening" states, everything else neutral. */
export const BOOKING_STATUS_BADGE_VARIANT: Record<BookingStatus, "dark" | "neutral"> = {
  PENDING: "neutral",
  CONFIRMED: "dark",
  DECLINED: "neutral",
  CANCELLED: "neutral",
  EXPIRED: "neutral",
  ACTIVE: "dark",
  COMPLETED: "neutral",
};

/**
 * Statuses S2-16 opens messaging for: once an owner has committed to a
 * booking through its handover and return. Mirrors
 * conversation_service.BOOKABLE_MESSAGE_STATUSES on the backend, which is
 * the actual authority — this only controls whether the "Message" link
 * renders, not whether the backend accepts the request.
 */
export const MESSAGEABLE_BOOKING_STATUSES: BookingStatus[] = ["CONFIRMED", "ACTIVE", "COMPLETED"];

/** Why an owner turned a request down. The renter is told which. */
export type DeclineReason = "DATES_UNAVAILABLE" | "ITEM_UNAVAILABLE" | "RENTER_NOT_SUITABLE" | "LOGISTICS" | "OTHER";

/** In the order the owner's decline form offers them; OTHER needs a note. */
export const DECLINE_REASON_LABELS: Record<DeclineReason, string> = {
  DATES_UNAVAILABLE: "I can't do those dates",
  ITEM_UNAVAILABLE: "The item isn't available",
  RENTER_NOT_SUITABLE: "Not the right fit for this rental",
  LOGISTICS: "I can't arrange the handover",
  OTHER: "Other",
};

/** One unanswered request, as the owner's request list shows it. */
export type BookingRequestSummary = {
  id: string;
  listing_id: string;
  listing_name: string | null;
  renter_id: string;
  renter_display_name: string | null;
  start_date: string;
  end_date: string;
  rental_days: number | null;
  respond_by: string | null;
  /** By the server's clock, so a client whose clock is off still counts down correctly. */
  expires_in_seconds: number | null;
  created_at: string;
};

/** One request as the owner reviews it before deciding. */
export type BookingRequestDetail = {
  id: string;
  listing_id: string;
  listing_name: string | null;
  status: BookingStatus;
  respond_by: string | null;
  expires_in_seconds: number | null;
  renter: {
    id: string;
    display_name: string | null;
    bio: string | null;
    member_since: string | null;
    email_verified: boolean;
    /** Null until renters can be rated. */
    rating: number | null;
    review_count: number;
    completed_rentals: number;
  };
  period: { start_date: string; end_date: string; rental_days: number | null };
  pricing: {
    price_per_day_cents: number | null;
    price_per_week_cents: number | null;
    rental_subtotal_cents: number | null;
    platform_fee_cents: number | null;
    deposit_cents: number | null;
    total_amount_cents: number | null;
    /** Nothing can be selected until damage protection is offered. */
    damage_protection: { selected: boolean; fee_cents: number };
    owner_net_earnings_cents: number | null;
  };
  created_at: string;
};
