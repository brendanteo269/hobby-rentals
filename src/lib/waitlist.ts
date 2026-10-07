/**
 * Waitlist vocabulary: the shape of a queue place and the words shown for it.
 *
 * Free of `server-only`, like @/lib/listings, because the booking calendar is
 * a client component and needs these; the calls live in @/lib/api/waitlist.
 *
 * The statuses mirror WaitlistStatus in app/waitlist_service.py. They are
 * duplicated rather than derived because the backend is a separate
 * deployable: a value added there should fail type-checking here until this
 * file gets it, which is the reminder that it needs a label too.
 */

export type WaitlistStatus = "WAITING" | "OFFERED" | "BOOKED" | "EXPIRED" | "LEFT";

export type WaitlistEntry = {
  id: string;
  listing_id: string;
  listing_name: string | null;
  renter_id: string;
  start_date: string;
  end_date: string;
  status: WaitlistStatus;
  offered_at: string | null;
  /** Set while the entry holds its 24-hour exclusive right to book. */
  offer_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export const WAITLIST_STATUS_LABELS: Record<WaitlistStatus, string> = {
  WAITING: "Waiting",
  OFFERED: "Your turn",
  BOOKED: "Booked",
  EXPIRED: "Expired",
  LEFT: "Left",
};

/** Statuses that still hold a place in a queue. */
export function isOpen(entry: WaitlistEntry): boolean {
  return entry.status === "WAITING" || entry.status === "OFFERED";
}

/**
 * Whether an offer's 24 hours are still running.
 *
 * An OFFERED entry whose deadline has passed is one the sweep has not closed
 * yet; treating it as live would invite the renter to book dates the next
 * person in the queue is about to be offered.
 */
export function hasLiveOffer(entry: WaitlistEntry, now: Date = new Date()): boolean {
  return (
    entry.status === "OFFERED" &&
    entry.offer_expires_at !== null &&
    new Date(entry.offer_expires_at) > now
  );
}

/** "3 days" — how long a queue place covers, both ends inclusive. */
export function waitlistDays(entry: Pick<WaitlistEntry, "start_date" | "end_date">): number {
  const start = new Date(`${entry.start_date}T00:00:00`);
  const end = new Date(`${entry.end_date}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}
