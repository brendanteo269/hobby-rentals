import { notFound, redirect } from "next/navigation";
import { MessagesShell } from "@/components/messages/messages-shell";
import { ConversationList } from "@/components/messages/conversation-list";
import { ConversationHeader } from "@/components/messages/conversation-header";
import { MessageComposer } from "@/components/messages/message-composer";
import { getConversationLimits, getMyConversations } from "@/lib/api/conversations";
import { getListing } from "@/lib/api/listings";
import { getMyBookings, getOwnerBookings } from "@/lib/api/bookings";
import type { BookingStatus } from "@/lib/bookings";
import { listingPriceLocationLine, type ConversationRole } from "@/lib/conversations";
import { createClient } from "@/lib/supabase/server";

/**
 * The pre-thread screen "Message owner"/"Message" link to: same shell and
 * header a real conversation uses, just with no messages yet and a composer
 * that creates the thread on first send - so starting a conversation looks
 * like opening one, not filling out a form.
 */
export default async function NewConversationPage({
  searchParams,
}: {
  searchParams: Promise<{ listing?: string; booking?: string }>;
}) {
  const { listing, booking } = await searchParams;
  if (!listing && !booking) notFound();

  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  if (!user) notFound();

  // Each listing/booking has at most one thread (enforced by a partial
  // unique index in the DB); re-opening "Message" on one you've already
  // messaged about should land on that thread, not ask for a first message
  // again.
  const [conversations, attachmentLimits] = await Promise.all([getMyConversations(), getConversationLimits()]);
  const existing = listing
    ? conversations.find((c) => c.scope === "LISTING" && c.listing_id === listing)
    : conversations.find((c) => c.scope === "BOOKING" && c.booking_id === booking);
  if (existing) redirect(`/messages/${existing.id}`);

  let listingId: string;
  let otherPartyRole: ConversationRole;
  let bookingInfo: { status: BookingStatus; startDate: string; endDate: string } | null = null;
  if (listing) {
    listingId = listing;
    otherPartyRole = "OWNER";
  } else {
    // No single-booking lookup exists on the client; whichever side of the
    // booking the viewer is on, it's in one of these two lists.
    const [mine, owned] = await Promise.all([getMyBookings(), getOwnerBookings()]);
    const targetBooking = [...mine, ...owned].find((b) => b.id === booking);
    if (!targetBooking) notFound();
    listingId = targetBooking.listing_id;
    otherPartyRole = targetBooking.owner_id === user.id ? "RENTER" : "OWNER";
    bookingInfo = { status: targetBooking.status, startDate: targetBooking.start_date, endDate: targetBooking.end_date };
  }

  const listingRecord = await getListing(listingId).catch(() => null);
  if (!listingRecord) notFound();

  return (
    <MessagesShell list={<ConversationList conversations={conversations} />}>
      <div className="flex h-full flex-col">
        <ConversationHeader
          listingId={listingRecord.id}
          photoUrl={listingRecord.photo_urls[0] ?? null}
          listingName={listingRecord.name}
          priceLocation={listingPriceLocationLine(listingRecord)}
          booking={bookingInfo}
          otherPartyRole={otherPartyRole}
        />

        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <p className="body-copy max-w-xs text-sm text-ink-soft">
            Personal contact details are never required — this thread is where you arrange pickup, condition, and
            dates. Say hello to start the conversation.
          </p>
        </div>

        <div className="border-t border-line p-4">
          <MessageComposer
            target={listing ? { kind: "listing", listingId: listing } : { kind: "booking", bookingId: booking! }}
            label="Your message"
            placeholder="Is it free this Saturday?"
            attachmentLimits={attachmentLimits}
          />
        </div>
      </div>
    </MessagesShell>
  );
}
