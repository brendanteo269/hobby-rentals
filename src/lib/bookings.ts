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

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: "Awaiting owner",
  CONFIRMED: "Confirmed",
  ACTIVE: "In progress",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};
