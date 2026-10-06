"use client";

import { useEffect, useRef, useState } from "react";
import type { Message } from "@/lib/conversations";
import { formatChatTimestamp } from "@/lib/format";
import { AttachmentLightbox } from "./attachment-lightbox";
import { MeetupProposalCard } from "./meetup-proposal-card";
import { PersonAvatar } from "./person-avatar";

/**
 * A thread's messages, oldest first. Read-only: a message is never edited,
 * and a withdrawn one still occupies its place, showing a placeholder
 * instead of its body rather than disappearing.
 *
 * A client component only so it can scroll to the newest message after
 * mount (and whenever one arrives) - otherwise a thread longer than the pane
 * opens showing its oldest messages, with the latest one - and the reply box
 * right under it - out of view until the viewer scrolls down manually.
 */
export function MessageThread({
  messages,
  currentUserId,
  otherPartyName,
  pendingMeetupProposalId = null,
  confirmedMeetupProposalId = null,
  onMeetupAccepted,
  onMeetupRejected,
}: {
  messages: Message[];
  currentUserId: string;
  /** Shown next to the other party's own bubbles - the viewer's own need no name/avatar, their side and colour already say whose they are. */
  otherPartyName: string | null;
  /** S2-19: id of the one proposal still awaiting a response - only its card gets Accept/Reject controls; an older, superseded proposal is just history. */
  pendingMeetupProposalId?: string | null;
  /** S2-19 Scenario 5: id of the currently-confirmed proposal, so its card can flag itself as having a reschedule pending once a newer proposal exists. */
  confirmedMeetupProposalId?: string | null;
  onMeetupAccepted?: (message: Message) => void;
  /** None of the pending proposal's times work - opens the propose-a-meetup modal. */
  onMeetupRejected?: () => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  if (messages.length === 0) {
    return <p className="body-copy p-6 text-center">No messages yet. Say hello.</p>;
  }

  return (
    <div>
      <ol className="flex flex-col gap-4 p-5 sm:p-6">
        {messages.map((message) => {
          const mine = message.sender_id === currentUserId;

          if (message.meetup_proposal) {
            const isActionable = !mine && message.meetup_proposal.id === pendingMeetupProposalId;
            const pendingReschedule =
              message.meetup_proposal.id === confirmedMeetupProposalId && pendingMeetupProposalId !== null;
            // An earlier message that was itself accepted, but a later
            // proposal has since been accepted in its place - history, not
            // just a superseded *offer* the way an unaccepted one is.
            const supersededByLaterAcceptance =
              message.meetup_event_type === "ACCEPTED" && message.meetup_proposal.id !== confirmedMeetupProposalId;
            return (
              <li key={message.id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                {!mine && <PersonAvatar name={otherPartyName} size="sm" />}
                <MeetupProposalCard
                  message={message}
                  isActionable={isActionable}
                  pendingReschedule={pendingReschedule}
                  rescheduled={supersededByLaterAcceptance}
                  onAccepted={(accepted) => onMeetupAccepted?.(accepted)}
                  onReject={() => onMeetupRejected?.()}
                />
              </li>
            );
          }

          const hasAttachments = message.attachment_urls.length > 0;
          return (
            <li key={message.id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
              {!mine && <PersonAvatar name={otherPartyName} size="sm" />}
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${hasAttachments ? "w-full max-w-[85%] sm:max-w-sm" : "max-w-[70%]"} ${mine ? "bg-ink text-white" : "bg-surface-muted text-ink"}`}
              >
                {message.withdrawn_at ? (
                  <p className="italic opacity-70">Message withdrawn</p>
                ) : (
                  <>
                    {hasAttachments && (
                      // Full-width, meetup-card-sized photos rather than a
                      // grid of small thumbnails - a shared photo is the
                      // point of the message, not an aside next to the text.
                      <ul className={`flex flex-col gap-2 ${message.body ? "mb-2" : ""}`}>
                        {message.attachment_urls.map((url) => (
                          <li key={url}>
                            <button
                              type="button"
                              onClick={() => setLightboxUrl(url)}
                              aria-label="View attachment full size"
                              className="block h-48 w-full overflow-hidden rounded-xl sm:h-56"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element -- S3 attachment URL, not an optimizable remote image */}
                              <img src={url} alt="" className="h-full w-full object-cover" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {message.body && <p className="whitespace-pre-line">{message.body}</p>}
                  </>
                )}
                <p className={`mt-1.5 text-[0.6875rem] ${mine ? "text-white/70" : "text-ink-soft"}`}>
                  <time dateTime={message.created_at}>{formatChatTimestamp(message.created_at)}</time>
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <div ref={bottomRef} />
      {lightboxUrl && <AttachmentLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  );
}
