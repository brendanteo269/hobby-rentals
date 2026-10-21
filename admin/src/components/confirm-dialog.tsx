"use client";

import { useEffect, type ReactNode } from "react";
import { Button } from "./ui";

/**
 * A dialog that asks an administrator to be sure before something that matters
 * happens. `tone="danger"` is for what cannot be undone: a red frame and a red
 * confirm button, with the consequences spelled out in the body, so the choice
 * is made knowing them. Escape and a click outside both cancel.
 */
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  tone = "neutral",
  pending = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  tone?: "neutral" | "danger";
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const danger = tone === "danger";
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onCancel()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className={`w-full max-w-md overflow-hidden rounded-sm bg-white shadow-xl ${danger ? "border-2 border-bad" : "border border-line"}`}
      >
        <div className={`px-6 py-4 ${danger ? "bg-bad text-white" : "border-b border-line"}`}>
          <h2 id="confirm-dialog-title" className="display-caps text-lg">
            {title}
          </h2>
        </div>
        <div className="px-6 py-5 text-sm">{children}</div>
        <div className={`flex justify-end gap-3 px-6 py-4 ${danger ? "bg-bad/5" : "bg-sand"}`}>
          <Button variant="outline" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`inline-flex items-center justify-center rounded-sm px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 ${
              danger ? "bg-bad text-white hover:bg-bad/90" : "bg-ink text-cream hover:bg-ink-soft"
            }`}
          >
            {pending ? "Saving…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
