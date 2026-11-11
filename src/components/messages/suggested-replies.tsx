"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { fetchReplySuggestions } from "@/app/messages/actions";
import type { ReplySuggestion } from "@/lib/conversations";

/**
 * S6-13: up to three suggested replies above the owner's message box, for the
 * renter message `afterMessageId`. Asked for after the page has loaded, so the
 * chat never waits on the model; with none (the model is down, or nothing it
 * offered passed the checks) nothing renders. Tapping one hands its text to
 * the composer to edit - it is never sent from here.
 */
export function SuggestedReplies({
  conversationId,
  afterMessageId,
  onPick,
}: {
  conversationId: string;
  afterMessageId: string;
  onPick: (suggestion: ReplySuggestion) => void;
}) {
  // Keyed by the message they answer, so a newer renter message never shows
  // the previous message's suggestions while its own are on their way.
  const [loaded, setLoaded] = useState<{ after: string; suggestions: ReplySuggestion[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchReplySuggestions(conversationId).then((result) => {
      if (!cancelled) setLoaded({ after: afterMessageId, suggestions: result.after_message_id === afterMessageId ? result.suggestions : [] });
    });
    return () => {
      cancelled = true;
    };
  }, [conversationId, afterMessageId]);

  const current = loaded?.after === afterMessageId ? loaded : null;
  if (!current) {
    return (
      <p className="mb-2 flex items-center gap-1.5 text-xs text-ink-soft" aria-live="polite">
        <Sparkles className="size-3.5 animate-pulse text-accent" aria-hidden="true" />
        Suggesting replies…
      </p>
    );
  }
  if (current.suggestions.length === 0) return null;

  return (
    <div className="mb-2" aria-label="Suggested replies">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs text-ink-soft">
        <Sparkles className="size-3.5 text-accent" aria-hidden="true" />
        Suggested replies - tap one to edit it before sending
      </p>
      <ul className="flex flex-wrap gap-2">
        {current.suggestions.map((suggestion) => (
          <li key={suggestion.id}>
            <button
              type="button"
              onClick={() => onPick(suggestion)}
              className="max-w-full rounded-2xl border border-line bg-white px-3 py-1.5 text-left text-sm text-ink transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              {suggestion.text}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
