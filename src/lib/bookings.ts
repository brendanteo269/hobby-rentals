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
