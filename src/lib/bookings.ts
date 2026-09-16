export type BookingStatus = "PENDING" | "CONFIRMED" | "ACTIVE" | "CANCELLED" | "COMPLETED";

export type Booking = {
  id: string;
  listing_id: string;
  renter_id: string;
  owner_id: string;
  start_date: string;
  end_date: string;
  status: BookingStatus;
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
