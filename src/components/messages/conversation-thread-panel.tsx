"use client";

import { useState, type ReactNode } from "react";
import { MessageThread } from "./message-thread";
import { MessageComposer } from "./message-composer";
import { MeetupProposalModal } from "./meetup-proposal-modal";
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
  bookingId,
  meetupEligible = false,
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
  /** S2-19: the booking this thread belongs to - needed to propose a meetup. Only set for a BOOKING-scope thread. */
  bookingId?: string;
  /** S2-19: whether "Arrange meetup" should be offered at all (AC6) - true only while the booking is CONFIRMED. */
  meetupEligible?: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [showMeetupModal, setShowMeetupModal] = useState(false);
  const meetupState = deriveMeetupState(messages);

  function appendMessage(message: Message) {
    setMessages((current) => [...current, message]);
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <MessageThread
          messages={messages}
          currentUserId={currentUserId}
          otherPartyName={otherPartyName}
          pendingMeetupProposalId={meetupState.pending?.id ?? null}
          onMeetupAccepted={appendMessage}
          onReproposeMeetup={() => setShowMeetupModal(true)}
        />
      </div>

      {bookingId && meetupEligible && (
        <div className="border-t border-line px-4 py-3">
          <button
            type="button"
            onClick={() => setShowMeetupModal(true)}
            className="text-sm font-medium underline underline-offset-4"
          >
            {meetupState.pending || meetupState.confirmed ? "Propose a new meetup" : "Arrange meetup"}
          </button>
        </div>
      )}

      <div className="border-t border-line p-4">
        {replaceComposerWith ?? (
          <MessageComposer
            target={{ kind: "reply", conversationId }}
            label="Reply"
            placeholder="Write a reply…"
            attachmentLimits={attachmentLimits}
            onSent={appendMessage}
          />
        )}
      </div>

      {showMeetupModal && bookingId && (
        <MeetupProposalModal
          bookingId={bookingId}
          onClose={() => setShowMeetupModal(false)}
          onSent={appendMessage}
        />
      )}
    </>
  );
}
