import { notFound } from "next/navigation";
import { MessagesShell } from "@/components/messages/messages-shell";
import { ConversationList } from "@/components/messages/conversation-list";
import { ConversationActionsMenu } from "@/components/messages/conversation-actions-menu";
import { ConversationHeader } from "@/components/messages/conversation-header";
import { ConversationThreadPanel } from "@/components/messages/conversation-thread-panel";
import { EnquiryBookingStatus } from "@/components/messages/enquiry-booking-status";
import { MessageButton } from "@/components/messages/message-button";
import { ButtonLink } from "@/components/ui";
import { getConversation, getConversationLimits, getMessages, getMyConversations } from "@/lib/api/conversations";
import { getBookingAvailability, getListing } from "@/lib/api/listings";
import { getMyBookings, getOwnerBookings } from "@/lib/api/bookings";
import { conversationPriceLocationLine, type Conversation } from "@/lib/conversations";
import { unavailableReason } from "@/lib/cancellations";
import { MESSAGEABLE_BOOKING_STATUSES, RETRYABLE_BOOKING_STATUSES, type Booking } from "@/lib/bookings";
import { createClient } from "@/lib/supabase/server";

/**
 * The most recent booking between this conversation's two parties for its
 * listing, or null - derived from the bookings list rather than the
 * conversation's own booking_id, which only links once a booking is
 * CONFIRMED (see conversation_service.get_or_create_booking_conversation on
 * the backend). A still-PENDING or DECLINED request is otherwise invisible
 * to the enquiry thread it came from, which is exactly what the inline
 * status card needs to show. other_party_role tells us which side the
 * viewer is on, so only one list needs fetching, not both.
 */
async function findRelevantBooking(conversation: Conversation): Promise<Booking | null> {
  const bookings =
    conversation.other_party_role === "OWNER"
      ? await getMyBookings()
      : (await getOwnerBookings()).filter((b) => b.renter_id === conversation.other_party_id);

  const matches = bookings.filter((b) => b.listing_id === conversation.listing_id);
  if (matches.length === 0) return null;
  return matches.reduce((latest, b) => (b.created_at > latest.created_at ? b : latest));
}

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  if (!user) notFound();

  let conversation, messagePage, conversations, attachmentLimits, relevantBooking;
  try {
    // Fetched first, and awaited on its own: GET /conversations/{id} marks
    // the thread read as a side effect, and the list fetch right after needs
    // that to have already happened so its own unread dot is correct.
    conversation = await getConversation(id);
    [messagePage, conversations, attachmentLimits, relevantBooking] = await Promise.all([
      getMessages(id),
      getMyConversations(),
      getConversationLimits(),
      conversation.scope === "LISTING" ? findRelevantBooking(conversation) : Promise.resolve(null),
    ]);
  } catch {
    notFound();
  }

  // Only fetched once we know it's actually needed: a confirmed/active/
  // completed booking means no new request can be made here, so there's
  // nothing for the calendar/quote form to do.
  const canRequestBooking =
    conversation.scope === "LISTING" && (!relevantBooking || RETRYABLE_BOOKING_STATUSES.includes(relevantBooking.status));
  const [listing, availability] = canRequestBooking
    ? await Promise.all([getListing(conversation.listing_id), getBookingAvailability(conversation.listing_id)])
    : [null, null];

  // For a LISTING-scope enquiry, relevantBooking (not conversation.booking_*,
  // which lags until confirmed) is what the header's existing badge/date
  // display should reflect - same booking the status card below is driven
  // by, so the two can't disagree.
  const headerBooking =
    conversation.scope === "LISTING"
      ? relevantBooking
        ? { status: relevantBooking.status, startDate: relevantBooking.start_date, endDate: relevantBooking.end_date }
        : null
      : conversation.booking_status && conversation.booking_start_date && conversation.booking_end_date
        ? { status: conversation.booking_status, startDate: conversation.booking_start_date, endDate: conversation.booking_end_date }
        : null;

  // A booking the platform cancelled: an administrator, or a member's suspension or ban.
  const cancelledAccount = unavailableReason(conversation.booking_cancelled_reason);
  const platformCancellation =
    conversation.booking_status === "CANCELLED" && conversation.booking_cancelled_by === "SYSTEM"
      ? cancelledAccount
        ? `This booking was cancelled because the ${cancelledAccount.account}'s account was ${cancelledAccount.kind}.`
        : `This booking was cancelled by an administrator.${conversation.booking_cancelled_note ? ` Reason: ${conversation.booking_cancelled_note}` : ""}`
      : null;
  const bookingConfirmed = Boolean(relevantBooking && MESSAGEABLE_BOOKING_STATUSES.includes(relevantBooking.status));
  // Linking straight to the booking thread's own id (already in hand from
  // the conversations list fetched above) skips the detour through
  // /messages/new?booking=... MessageButton's target normally takes:
  // that route exists to get-or-create the thread, but it always does so
  // via a server redirect once it finds one already exists - a visible
  // double navigation for what, most of the time, is just "go to a thread
  // that's already there". Falls back to MessageButton only the first
  // time, before anyone has sent that thread's first message yet.
  const existingBookingConversation = relevantBooking
    ? conversations.find((c) => c.scope === "BOOKING" && c.booking_id === relevantBooking.id)
    : undefined;

  return (
    <MessagesShell list={<ConversationList conversations={conversations} activeId={id} />}>
      <div className="flex h-full flex-col">
        <ConversationHeader
          listingId={conversation.listing_id}
          photoUrl={conversation.listing_photo_url}
          listingName={conversation.listing_name}
          priceLocation={conversationPriceLocationLine(conversation)}
          booking={headerBooking}
          otherPartyId={conversation.other_party_id}
          otherPartyName={conversation.other_party_name ?? "Member"}
          otherPartyRole={conversation.other_party_role}
          actions={
            // S3-22: only a booking conversation can be reported from.
            conversation.scope === "BOOKING" && conversation.other_party_id ? (
              <ConversationActionsMenu conversationId={id} otherPartyName={conversation.other_party_name ?? "this member"} />
            ) : undefined
          }
        />

        <ConversationThreadPanel
          key={id}
          conversationId={id}
          initialMessages={messagePage.messages}
          initialHasMore={messagePage.has_more}
          currentUserId={user.id}
          otherPartyName={conversation.other_party_name}
          attachmentLimits={attachmentLimits}
          bookingId={conversation.scope === "BOOKING" ? conversation.booking_id ?? undefined : undefined}
          meetupEligible={conversation.scope === "BOOKING" && conversation.booking_status === "CONFIRMED"}
          defaultLocationArea={conversation.listing_location_area}
          bookingStartDate={conversation.scope === "BOOKING" ? conversation.booking_start_date : null}
          bookingEndDate={conversation.scope === "BOOKING" ? conversation.booking_end_date : null}
          footerBanner={
            conversation.scope === "LISTING" ? (
              <EnquiryBookingStatus
                initialBooking={relevantBooking}
                listingId={conversation.listing_id}
                availableDates={availability?.available_dates ?? []}
                unavailableDates={availability?.unavailable_dates ?? []}
                minRentalDays={listing?.min_rental_days ?? null}
                maxRentalDays={listing?.max_rental_days ?? null}
              />
            ) : undefined
          }
          replaceComposerWith={
            // S4-15: a claim freezes the thread as the record for arbitration - everything stays
            // readable, nothing new can be sent. This outranks the notices below.
            conversation.read_only ? (
              <div className="space-y-1 rounded-2xl border border-line bg-surface-muted px-4 py-3 text-sm text-ink">
                <p className="font-medium">This conversation is read-only</p>
                <p className="text-ink-soft">
                  A claim has been opened on this booking, so the conversation is kept exactly as it is. You can still read
                  every message, but new messages can&apos;t be sent.
                </p>
              </div>
            ) :
            // S3-24: no more messages to or from a suspended or banned member, and
            // a booking the platform cancelled says so.
            conversation.other_party_unavailable || platformCancellation ? (
              <div className="space-y-2 rounded-2xl border border-line bg-surface-muted px-4 py-3 text-sm text-ink">
                {platformCancellation && <p>{platformCancellation}</p>}
                {conversation.other_party_unavailable && (
                  <p>
                    {conversation.other_party_name ?? "This member"}&apos;s account has been{" "}
                    {conversation.other_party_enforcement === "BAN" ? "banned" : "suspended"}, so this conversation can&apos;t
                    take new messages.
                  </p>
                )}
              </div>
            ) : bookingConfirmed && relevantBooking ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface-muted px-4 py-3">
                <p className="text-sm text-ink">
                  This booking is confirmed — continue the conversation in its own thread.
                </p>
                {existingBookingConversation ? (
                  <ButtonLink
                    href={`/messages/${existingBookingConversation.id}`}
                    variant="outline"
                    className="shrink-0 px-3 py-1.5 text-xs"
                  >
                    Go to booking thread
                  </ButtonLink>
                ) : (
                  <MessageButton
                    target={{ kind: "booking", bookingId: relevantBooking.id }}
                    label="Go to booking thread"
                    className="shrink-0 px-3 py-1.5 text-xs"
                  />
                )}
              </div>
            ) : undefined
          }
        />
      </div>
    </MessagesShell>
  );
}
