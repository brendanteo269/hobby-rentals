"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/toast";
import { usePolling } from "@/components/use-polling";
import { useRealtimeSignal } from "@/components/use-realtime-signal";
import { useSingleFlight } from "@/components/use-single-flight";
import { MessageThread } from "./message-thread";
import { MessageComposer } from "./message-composer";
import { MeetupProposalModal } from "./meetup-proposal-modal";
import { ConfirmedMeetupBar } from "./confirmed-meetup-bar";
import { loadEarlierMessages } from "@/app/messages/actions";
import { deriveMeetupState } from "@/lib/meetups";
import type { ConversationLimits, Message, MessagePage } from "@/lib/conversations";

/**
 * Safety-net interval for an open thread. New messages normally arrive via a
 * Realtime signal; this only covers a missed event or a dead socket.
 */
const THREAD_FALLBACK_POLL_MS = 45_000;

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
  initialHasMore = false,
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
  /** S2-16: whether an earlier page of this thread exists beyond initialMessages - see GET /conversations/{id}/messages. */
  initialHasMore?: boolean;
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
  const { show, dismiss } = useToast();
  // Set when the tab is hidden; cleared by the first successful check made
  // once it's visible again. Only then are newly-found messages ones the viewer missed.
  const wasAway = useRef(false);
  const awayToastId = useRef<number | null>(null);
  const missedWhileAway = useRef(0);

  useEffect(() => {
    const markAway = () => {
      if (document.visibilityState === "hidden") wasAway.current = true;
    };
    document.addEventListener("visibilitychange", markAway);
    return () => document.removeEventListener("visibilitychange", markAway);
  }, []);

  // Also clears it on unmount, so navigating to another thread doesn't leave
  // a "new messages" toast about this one behind.
  useEffect(() => {
    const toastId = awayToastId;
    return () => {
      if (toastId.current !== null) dismiss(toastId.current);
    };
  }, [dismiss]);

  function dismissAwayToast() {
    if (awayToastId.current === null) return;
    dismiss(awayToastId.current);
    awayToastId.current = null;
    missedWhileAway.current = 0;
  }
  const [messages, setMessages] = useState(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showMeetupModal, setShowMeetupModal] = useState(false);
  const meetupState = deriveMeetupState(messages);
  // The scrollable thread, so loadEarlier can keep the viewer looking at the
  // same message once older ones land above it, rather than the browser's
  // default of leaving scrollTop as-is - which, measured from a now-taller
  // top, visually yanks the view down to whatever is newly under it.
  const scrollRef = useRef<HTMLDivElement>(null);

  // Deduped by id: a sent message can also come back from a poll that was
  // already in flight when it was appended.
  function appendMessage(message: Message) {
    setMessages((current) => (current.some((m) => m.id === message.id) ? current : [...current, message]));
  }

  // Pulls in what the other party sent while this thread is open, so the
  // viewer never has to refresh. See /api/messages/[id]/latest.
  const checkForNewMessages = useSingleFlight(async () => {
    try {
      const after = messages.at(-1)?.id ?? "";
      const response = await fetch(`/api/messages/${encodeURIComponent(conversationId)}/latest?after=${encodeURIComponent(after)}`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const page = (await response.json()) as MessagePage;
      const known = new Set(messages.map((m) => m.id));
      const lastAt = messages.at(-1)?.created_at ?? "";
      const incoming = page.messages.filter((m) => !known.has(m.id) && m.created_at > lastAt);
      incoming.forEach(appendMessage);

      // The tab was in the background, so polling was paused and these
      // arrived unseen: leave a toast up until the viewer engages with the
      // reply box (dismissAwayToast), not on a timer they may have missed.
      // Realtime delivers while the tab is hidden, so several checks can
      // land before the viewer returns: the count accumulates across them.
      const arrived = incoming.filter((m) => m.sender_id !== currentUserId).length;
      if (wasAway.current && arrived > 0) {
        missedWhileAway.current += arrived;
        const total = missedWhileAway.current;
        if (awayToastId.current !== null) dismiss(awayToastId.current);
        awayToastId.current = show(
          `${total} new ${total === 1 ? "message" : "messages"} from ${otherPartyName ?? "the other party"}`,
          "info",
          { persist: true },
        );
      }
      if (document.visibilityState === "visible") wasAway.current = false;
    } catch {
      // Retried on the next tick; a transient failure isn't worth interrupting the viewer.
    }
  });

  useRealtimeSignal(
    {
      channel: `thread-${conversationId}`,
      table: "messages",
      event: "INSERT",
      filter: `conversation_id=eq.${conversationId}`,
    },
    checkForNewMessages,
  );
  usePolling(checkForNewMessages, THREAD_FALLBACK_POLL_MS);

  async function loadEarlier() {
    const oldest = messages[0];
    if (!oldest || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const result = await loadEarlierMessages(conversationId, oldest.created_at);
      if ("error" in result) {
        show(result.error, "error");
        return;
      }
      const container = scrollRef.current;
      const prevScrollHeight = container?.scrollHeight ?? 0;
      const prevScrollTop = container?.scrollTop ?? 0;
      // Forced synchronous so the container's new scrollHeight below is the
      // one *after* the prepended messages have actually been painted, not
      // the stale one from before this update.
      flushSync(() => {
        setMessages((current) => [...result.messages, ...current]);
        setHasMore(result.has_more);
      });
      if (container) {
        container.scrollTop = prevScrollTop + (container.scrollHeight - prevScrollHeight);
      }
    } finally {
      setIsLoadingMore(false);
    }
  }

  const meetupActive = Boolean(meetupState.pending || meetupState.confirmed);

  return (
    <>
      {meetupState.confirmed && (
        <ConfirmedMeetupBar confirmed={meetupState.confirmed} rescheduleProposed={meetupState.pending !== null} />
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <MessageThread
          messages={messages}
          currentUserId={currentUserId}
          otherPartyName={otherPartyName}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onLoadEarlier={loadEarlier}
          pendingMeetupProposalId={meetupState.pending?.id ?? null}
          confirmedMeetupProposalId={meetupState.confirmed?.id ?? null}
          onMeetupAccepted={appendMessage}
          onMeetupRejected={() => setShowMeetupModal(true)}
        />
      </div>

      {footerBanner}

      <div className="border-t border-line p-4" onFocusCapture={dismissAwayToast}>
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
