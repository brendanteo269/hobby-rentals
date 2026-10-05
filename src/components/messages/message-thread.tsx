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
  onMeetupAccepted,
  onReproposeMeetup,
}: {
  messages: Message[];
  currentUserId: string;
  /** Shown next to the other party's own bubbles - the viewer's own need no name/avatar, their side and colour already say whose they are. */
  otherPartyName: string | null;
  /** S2-19: id of the one proposal still awaiting a response - only its card gets Accept/Re-propose controls; an older, superseded proposal is just history. */
  pendingMeetupProposalId?: string | null;
  onMeetupAccepted?: (message: Message) => void;
  onReproposeMeetup?: () => void;
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
            return (
              <li key={message.id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                {!mine && <PersonAvatar name={otherPartyName} size="sm" />}
                <MeetupProposalCard
                  message={message}
                  isActionable={isActionable}
                  onAccepted={(accepted) => onMeetupAccepted?.(accepted)}
                  onReproposeClick={() => onReproposeMeetup?.()}
                />
              </li>
            );
          }

          return (
            <li key={message.id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
              {!mine && <PersonAvatar name={otherPartyName} size="sm" />}
              <div className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${mine ? "bg-ink text-white" : "bg-surface-muted text-ink"}`}>
                {message.withdrawn_at ? (
                  <p className="italic opacity-70">Message withdrawn</p>
                ) : (
                  <>
                    {message.attachment_urls.length > 0 && (
                      <ul className="mb-2 flex flex-wrap gap-1.5">
                        {message.attachment_urls.map((url) => (
                          <li key={url}>
                            <button
                              type="button"
                              onClick={() => setLightboxUrl(url)}
                              aria-label="View attachment full size"
                              className="block h-32 w-32 overflow-hidden rounded-lg"
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
