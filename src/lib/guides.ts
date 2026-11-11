/**
 * S6-02: an owner's quick-start guide for one listing - shapes, limits and
 * the small rules both the owner's editor and the renter's page need.
 *
 * Mirrors app/routers/listing_guides.py. The owner's shape carries photo
 * keys for re-saving; the renter's never does, only short-lived signed URLs.
 * Client-safe: no server-only imports.
 */

export const MAX_GUIDE_STEPS = 10;
export const MAX_GUIDE_STEP_CHARS = 500;
export const MAX_GUIDE_NOTES_CHARS = 1500;

/** Said wherever deleting is refused, so the disabled button and the API's 409 agree. */
export const GUIDE_DELETE_BLOCKED =
  "Renters with current bookings are relying on this guide, so it can't be deleted until those rentals end.";

/** One step as the owner edits it. */
export type OwnerGuideStep = { text: string; photo_key: string | null; photo_url: string | null };

export type OwnerGuide = {
  listing_id: string;
  safety_tips: string | null;
  return_notes: string | null;
  steps: OwnerGuideStep[];
  updated_at: string;
};

/** GET/PUT /listings/{id}/guide. `guide` is null before the owner writes one. */
export type OwnerGuideResponse = {
  guide: OwnerGuide | null;
  /** A CONFIRMED or ACTIVE booking relies on the guide, so it cannot be deleted. */
  has_current_renters: boolean;
};

/** GET /bookings/{id}/guide: what a renter with a current booking reads. */
export type RenterGuide = {
  booking_id: string;
  listing_id: string;
  listing_name: string | null;
  start_date: string;
  end_date: string;
  booked_at: string;
  safety_tips: string | null;
  return_notes: string | null;
  steps: { text: string; photo_url: string | null }[];
  updated_at: string;
};

/** GET /bookings/mine/guides: which of the renter's current bookings have a guide. */
export type GuideIndexEntry = { booking_id: string; listing_id: string; booked_at: string; updated_at: string };

/** What GuideView renders: the renter's page and the owner's preview alike. */
export type GuideContent = {
  safetyTips: string | null;
  returnNotes: string | null;
  steps: { text: string; photoUrl: string | null }[];
};

/**
 * Scenario 4: whether the owner changed the guide after this booking was
 * made, so the renter knows to read it again. Compared as instants, never as
 * strings - the two timestamps may carry different offsets.
 */
export function updatedSinceBooking(guide: { updated_at: string }, bookedAt: string): boolean {
  return new Date(guide.updated_at).getTime() > new Date(bookedAt).getTime();
}

/** The renter's guide index keyed by booking, for the booking lists. */
export function guidesByBooking(entries: GuideIndexEntry[]): Map<string, GuideIndexEntry> {
  return new Map(entries.map((entry) => [entry.booking_id, entry]));
}
