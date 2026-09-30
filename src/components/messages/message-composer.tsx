"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, inputBase } from "@/components/ui";
import { useToast } from "@/components/toast";
import { replyToConversation, startBookingConversation, startListingConversation } from "@/app/messages/actions";

type Target =
  | { kind: "reply"; conversationId: string }
  | { kind: "listing"; listingId: string }
  | { kind: "booking"; bookingId: string };

/**
 * A chat-bar composer - one text box and a send button beside it, like every
 * chat app - not a labelled form field. `label` still names the box for
 * screen readers via aria-label; it just isn't shown, since "Reply" printed
 * above a reply box a thread already makes obvious is noise, not context.
 *
 * `target` carries which action to call as plain data rather than a bound
 * function prop: a Server Component parent can hand a Client Component a
 * genuine Server Action reference or plain serializable data, but not an
 * arbitrary closure wrapping one (React rejects it as an "event handler"
 * crossing the boundary) - so the binding happens here, on the client, using
 * the id the caller already has.
 */
export function MessageComposer({
  target,
  label = "Message",
  placeholder = "Write a message…",
  submitLabel = "Send",
}: {
  target: Target;
  label?: string;
  placeholder?: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    const value = text.trim();
    if (!value) return;
    startTransition(async () => {
      if (target.kind === "reply") {
        const result = await replyToConversation(target.conversationId, value);
        if ("error" in result) {
          show(result.error, "error");
          return;
        }
        setText("");
        return;
      }

      const result =
        target.kind === "listing"
          ? await startListingConversation(target.listingId, value)
          : await startBookingConversation(target.bookingId, value);
      if ("error" in result) {
        show(result.error, "error");
        return;
      }
      router.push(`/messages/${result.conversation.id}`);
    });
  }

  return (
    <div className="flex items-end gap-2">
      <textarea
        aria-label={label}
        id="message-text"
        name="text"
        rows={1}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          // Enter sends, like every chat app; Shift+Enter still inserts a
          // newline for a multi-line message.
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        className={`${inputBase} max-h-32 flex-1 resize-none rounded-2xl`}
      />
      <Button className="shrink-0" disabled={isPending || !text.trim()} onClick={submit}>
        {isPending ? "Sending…" : submitLabel}
      </Button>
    </div>
  );
}
