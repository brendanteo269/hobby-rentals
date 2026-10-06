"use client";

import { useState, type ReactNode } from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui";
import { MessageThread } from "./message-thread";
import { MessageComposer } from "./message-composer";
import { MeetupProposalModal } from "./meetup-proposal-modal";
import { ConfirmedMeetupBar } from "./confirmed-meetup-bar";
import { deriveMeetupState } from "@/lib/meetups";
import type { ConversationLimits, Message } from "@/lib/conversations";

/**
 * Pairs MessageThread with its reply MessageComposer and owns the message
 * list as client state, seeded from the server-rendered page's initial
 * fetch. A reply appends to that state directly via onSent rather than
 * waiting on the Server Action's revalidatePath to refetch the whole page
 * (conversation, every message, the full conversations list) just to learn
 * what it already knows - that was the dominant cost in how long "Send"
 * visibly took.
 *
 * Render with `key={conversationId}` from the caller: switching to a
 * different thread must start fresh from that thread's own initialMessages,
 * not carry over state belonging to the one just left.
 */
export function ConversationThreadPanel({
  conversationId,
  initialMessages,
  currentUserId,
  otherPartyName,
  attachmentLimits,
  replaceComposerWith,
  footerBanner,
  bookingId,
  meetupEligible = false,
  defaultLocationArea = null,
  bookingStartDate = null,
}: {
  conversationId: string;
  initialMessages: Message[];
  currentUserId: string;
  otherPartyName: string | null;
  attachmentLimits?: ConversationLimits;
  /**
   * Rendered instead of the reply composer when set - the enquiry-side "this
   * booking is confirmed, continue in its own thread" banner uses this, so
   * new messages about a confirmed booking go to the booking thread rather
   * than the enquiry that led to it. This component stays unaware of *why*;
   * the caller (the page) is the single place that decides based on the
   * booking's status, so the banner and this swap can't disagree.
   */
  replaceComposerWith?: ReactNode;
  /**
   * Rendered above the composer, below the scrolling thread - the enquiry
   * side's "ready to lock in your dates?" / request-status card lives here
   * rather than above the thread, so it sits with the other actionable
   * controls (the composer, the meetup trigger) instead of pushing the
   * conversation itself further down the page.
   */
  footerBanner?: ReactNode;
  /** S2-19: the booking this thread belongs to - needed to propose a meetup. Only set for a BOOKING-scope thread. */
  bookingId?: string;
  /** S2-19: whether "Arrange meetup" should be offered at all (AC6) - true only while the booking is CONFIRMED. */
  meetupEligible?: boolean;
  /** S2-19 UX follow-up: the listing's own area, offered as the meetup location's starting point. */
  defaultLocationArea?: string | null;
  /**
   * The booking's own start date - the only day a proposed meetup may fall
   * on. Earlier is unsafe (a back-to-back booking means the item can still
   * be with the previous renter until this date), and the backend only
   * guarantees the item is this renter's to collect on it, not after.
   */
  bookingStartDate?: string | null;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [showMeetupModal, setShowMeetupModal] = useState(false);
  const meetupState = deriveMeetupState(messages);

  function appendMessage(message: Message) {
    setMessages((current) => [...current, message]);
  }

  const meetupActive = Boolean(meetupState.pending || meetupState.confirmed);

  return (
    <>
      {meetupState.confirmed && (
        <ConfirmedMeetupBar confirmed={meetupState.confirmed} rescheduleProposed={meetupState.pending !== null} />
      )}

      <div className="flex-1 overflow-y-auto">
        <MessageThread
          messages={messages}
          currentUserId={currentUserId}
          otherPartyName={otherPartyName}
          pendingMeetupProposalId={meetupState.pending?.id ?? null}
          confirmedMeetupProposalId={meetupState.confirmed?.id ?? null}
          onMeetupAccepted={appendMessage}
          onMeetupRejected={() => setShowMeetupModal(true)}
        />
      </div>

      {footerBanner}

      <div className="border-t border-line p-4">
        {replaceComposerWith ?? (
          <MessageComposer
            target={{ kind: "reply", conversationId }}
            label="Reply"
            placeholder="Write a reply…"
            attachmentLimits={attachmentLimits}
            onSent={appendMessage}
            extraButton={
              bookingId && meetupEligible ? (
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 px-2.5"
                  aria-label={meetupActive ? "Propose a new meetup" : "Arrange meetup"}
                  onClick={() => setShowMeetupModal(true)}
                >
                  <CalendarClock className="size-4" aria-hidden="true" />
                </Button>
              ) : undefined
            }
          />
        )}
      </div>

      {showMeetupModal && bookingId && bookingStartDate && (
        <MeetupProposalModal
          bookingId={bookingId}
          defaultLocationArea={defaultLocationArea}
          pickupDate={bookingStartDate}
          onClose={() => setShowMeetupModal(false)}
          onSent={appendMessage}
        />
      )}
    </>
  );
}
