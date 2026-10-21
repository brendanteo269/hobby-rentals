"use client";

import { useCallback, useRef, useState } from "react";
import { EllipsisVertical } from "lucide-react";
import { useDismiss } from "@/components/use-dismiss";
import { ReportUserModal } from "./report-user-modal";

/**
 * The three-dot menu beside the other person's name in a booking conversation
 * (S3-22). Its one action today is reporting them, so a rarely wanted and
 * serious action stays out of the way instead of sitting beside the name as a
 * button. The report form lives here, not in the dropdown, so it stays open
 * after the menu closes.
 */
export function ConversationActionsMenu({
  conversationId,
  otherPartyName,
}: {
  conversationId: string;
  otherPartyName: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useDismiss(rootRef, menuOpen, useCallback(() => setMenuOpen(false), []));

  return (
    <>
      <div ref={rootRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="Conversation actions"
          className="flex size-8 items-center justify-center rounded-full text-ink-soft outline-none transition-colors hover:bg-surface-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2"
        >
          <EllipsisVertical className="size-5" aria-hidden="true" />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                setReporting(true);
              }}
              className="block w-full px-4 py-2 text-left text-sm text-accent-dark transition-colors hover:bg-surface-muted"
            >
              Report user
            </button>
          </div>
        )}
      </div>

      {reporting && (
        <ReportUserModal
          conversationId={conversationId}
          otherPartyName={otherPartyName}
          onClose={() => setReporting(false)}
        />
      )}
    </>
  );
}
