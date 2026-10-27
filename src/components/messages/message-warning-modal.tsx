"use client";

import { useEffect } from "react";
import { ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui";
import type { MessageWarning } from "@/lib/conversations";
import { combineWarnings } from "@/lib/message-warnings";

/**
 * S4-15: the pop-up shown when the safety checks hold a message. Whatever was
 * found is one heading and one paragraph, with the automated check as a small line
 * under it, and the sender decides once: send the
 * message as it is, or go back to editing it. Closing it (Escape, the X, a click
 * outside) is the same as going back to editing - nothing is ever sent by dismissing.
 *
 * `contained` keeps it inside the open conversation: it covers that window (its
 * nearest positioned ancestor, the messages pane) and leaves the rest of the page
 * alone. Without it, it covers the whole screen, for a composer that is not inside a thread.
 */
export function MessageWarningModal({
  warnings,
  isSending,
  contained = false,
  onEdit,
  onSend,
}: {
  warnings: MessageWarning[];
  isSending: boolean;
  contained?: boolean;
  onEdit: () => void;
  onSend: () => void;
}) {
  const { title, body, note } = combineWarnings(warnings);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSending) onEdit();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isSending, onEdit]);

  return (
    <div
      className={`${contained ? "absolute z-40" : "fixed z-50"} inset-0 flex items-center justify-center bg-ink/40 p-4`}
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && !isSending && onEdit()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="message-warning-title"
        className="max-h-full w-full max-w-md overflow-y-auto card p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="message-warning-title" className="heading text-lg">
            {title}
          </h2>
          <button className="text-ink-soft hover:text-ink" aria-label="Close and keep editing" disabled={isSending} onClick={onEdit}>
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4 flex gap-3 text-sm">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-accent-dark" aria-hidden="true" />
          <div>
            <p className="text-ink-soft">{body}</p>
            {note && <p className="mt-2 text-xs text-ink-soft">{note}</p>}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={isSending} onClick={onEdit}>
            Edit message
          </Button>
          <Button type="button" disabled={isSending} onClick={onSend}>
            {isSending ? "Sending…" : "Send anyway"}
          </Button>
        </div>
      </div>
    </div>
  );
}
