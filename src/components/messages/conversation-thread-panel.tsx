"use client";

import { useState } from "react";
import { MessageThread } from "./message-thread";
import { MessageComposer } from "./message-composer";
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
  attachmentLimits,
}: {
  conversationId: string;
  initialMessages: Message[];
  currentUserId: string;
  attachmentLimits?: ConversationLimits;
}) {
  const [messages, setMessages] = useState(initialMessages);

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <MessageThread messages={messages} currentUserId={currentUserId} />
      </div>

      <div className="border-t border-line p-4">
        <MessageComposer
          target={{ kind: "reply", conversationId }}
          label="Reply"
          placeholder="Write a reply…"
          attachmentLimits={attachmentLimits}
          onSent={(message) => setMessages((current) => [...current, message])}
        />
      </div>
    </>
  );
}
