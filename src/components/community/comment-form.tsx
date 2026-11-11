"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, FormNotice } from "@/components/ui";
import { MessageWarningModal } from "@/components/messages/message-warning-modal";
import { submitComment } from "@/app/community/actions";
import type { Held } from "@/lib/forum";

/**
 * S6-11 Scenario 4 and 7: a comment or reply. A flagged one is held by the same
 * safety check as chat; "Send anyway" resends it with the confirmation.
 */
export function CommentForm({
  postId, parentId = null, autoFocus = false, onDone, placeholder = "Add a comment",
}: { postId: string; parentId?: string | null; autoFocus?: boolean; onDone?: () => void; placeholder?: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [held, setHeld] = useState<Held | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function send(confirmationId: string | null) {
    setError(null);
    startTransition(async () => {
      const result = await submitComment(postId, { body, parent_id: parentId, confirmation_id: confirmationId });
      if ("error" in result) {
        setHeld(null);
        return setError(result.error);
      }
      if (result.status === "needs_confirmation") return setHeld(result);
      setHeld(null);
      setBody("");
      onDone?.();
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (body.trim()) send(null);
      }}
      className="space-y-2"
    >
      <label htmlFor={`comment-${parentId ?? postId}`} className="sr-only">{placeholder}</label>
      <textarea
        id={`comment-${parentId ?? postId}`}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={parentId ? 2 : 3}
        maxLength={5000}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className="w-full resize-y rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none focus:border-ink"
      />
      <FormNotice message={error ?? undefined} />
      <div className="flex justify-end gap-2">
        {onDone && <Button type="button" variant="outline" className="px-4 py-2 text-xs" onClick={onDone}>Cancel</Button>}
        <Button type="submit" className="px-4 py-2 text-xs" disabled={isPending || !body.trim()}>
          {isPending ? "Posting…" : parentId ? "Reply" : "Comment"}
        </Button>
      </div>
      {held && (
        <MessageWarningModal warnings={held.warnings} isSending={isPending} onEdit={() => setHeld(null)} onSend={() => send(held.confirmation_id)} />
      )}
    </form>
  );
}
