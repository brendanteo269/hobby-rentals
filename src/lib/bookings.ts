export type BookingStatus = "PENDING" | "CONFIRMED" | "ACTIVE" | "CANCELLED" | "COMPLETED";

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
  ACTIVE: "In progress",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};

/** Badge colour for a booking's status - confirmed/active read as the "it's happening" states, everything else neutral. */
export const BOOKING_STATUS_BADGE_VARIANT: Record<BookingStatus, "dark" | "neutral"> = {
  PENDING: "neutral",
  CONFIRMED: "dark",
  ACTIVE: "dark",
  CANCELLED: "neutral",
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
