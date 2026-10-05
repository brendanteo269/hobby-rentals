import { formatMoney } from "@/lib/format";
import { isLocationArea, LOCATION_LABELS } from "@/lib/listings";
import type { BookingStatus } from "@/lib/bookings";

/** LISTING = an enquiry thread opened from a listing; BOOKING = opened from a booking. */
export type ConversationScope = "LISTING" | "BOOKING";

/** Which side of the listing the *other* party is on; the viewer is always the other role. */
export type ConversationRole = "OWNER" | "RENTER";

export const CONVERSATION_ROLE_LABELS: Record<ConversationRole, string> = {
  OWNER: "Owner",
  RENTER: "Renter",
};

/** Badge colour for the other party's role, so Owner and Renter read as visually distinct at a glance. */
export const CONVERSATION_ROLE_BADGE_VARIANT: Record<ConversationRole, "dark" | "accent"> = {
  OWNER: "dark",
  RENTER: "accent",
};

export type Conversation = {
  id: string;
  scope: ConversationScope;
  listing_id: string;
  listing_name: string;
  listing_price_per_day_cents: number | null;
  listing_location_area: string | null;
  listing_photo_url: string | null;
  booking_id: string | null;
  /** Set whenever booking_id is - either this thread's own booking, or the booking a LISTING-scope enquiry led to. */
  booking_status: BookingStatus | null;
  booking_start_date: string | null;
  booking_end_date: string | null;
  other_party_id: string;
  other_party_name: string | null;
  other_party_role: ConversationRole;
  unread: boolean;
  updated_at: string;
};

/** A meetup proposal's current fields (S2-19), refreshed to the proposal's latest state rather than frozen at the moment a given message announced it. */
export type MeetupProposal = {
  id: string;
  location: string;
  proposed_times: string[];
  proposed_by: string;
  accepted_time: string | null;
  accepted_by: string | null;
  accepted_at: string | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  /** S2-17: already-uploaded image URLs, resolved server-side from the stored S3 keys. Empty for a withdrawn message, same as body. */
  attachment_urls: string[];
  /** S2-19: set when this message announced a meetup proposal or its acceptance - see MeetupProposal. */
  meetup_event_type: "PROPOSED" | "ACCEPTED" | null;
  meetup_proposal: MeetupProposal | null;
  withdrawn_at: string | null;
  created_at: string;
};

/** What GET /conversations/limits returns - the composer validates a picked file against these before uploading it. */
export type ConversationLimits = {
  allowed_attachment_content_types: string[];
  max_attachment_bytes: number;
};

/** A message may carry at most this many image attachments - matches MessageRequest.attachment_keys' server-side cap. */
export const MAX_MESSAGE_ATTACHMENTS = 4;

/**
 * "$18/day · Tampines · Booking", trimmed to whatever's known. The listing's
 * *name* is shown separately (as the thread's heading, next to its photo) -
 * this is only the secondary line underneath, shared by the thread list and
 * an open thread's header so both describe a conversation's listing
 * identically. Takes any listing-shaped object rather than a Conversation
 * specifically, so the "start a new thread" screen - which has a listing but
 * no conversation yet - can use it too.
 */
export function listingPriceLocationLine(listing: {
  price_per_day_cents: number | null;
  location_area: string | null;
}): string {
  const parts: string[] = [];
  if (listing.price_per_day_cents != null) {
    parts.push(`${formatMoney(listing.price_per_day_cents)}/day`);
  }
  if (listing.location_area && isLocationArea(listing.location_area)) {
    parts.push(LOCATION_LABELS[listing.location_area]);
  }
  return parts.join(" · ");
}

export function conversationPriceLocationLine(conversation: Conversation): string {
  const line = listingPriceLocationLine({
    price_per_day_cents: conversation.listing_price_per_day_cents,
    location_area: conversation.listing_location_area,
  });
  return conversation.scope === "BOOKING" ? [line, "Booking"].filter(Boolean).join(" · ") : line;
}
