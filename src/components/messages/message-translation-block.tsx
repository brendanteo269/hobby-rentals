"use client";

import { useState } from "react";
import { translateBookingMessage } from "@/app/messages/actions";
import { TRANSLATED_BY_AI_LABEL, canOfferTranslation, visibleTranslation, type MessageTranslation } from "@/lib/translation";
import type { Message } from "@/lib/conversations";

/**
 * S6-04: what sits under an incoming message's own words - a "Translate" button,
 * then the translation with its "Translated by AI" label. The original is never
 * replaced or hidden: this only adds a second block beneath it.
 *
 * A reader with "Always translate" on gets `message.translation` from the server
 * already, so the button never shows for those; a tap fetches the same thing on demand.
 */
export function MessageTranslationBlock({
  message,
  currentUserId,
  canTranslate,
}: {
  message: Message;
  currentUserId: string;
  canTranslate: boolean;
}) {
  const [fetched, setFetched] = useState<MessageTranslation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canOfferTranslation(message, currentUserId, canTranslate) && !message.translation) return null;

  const translation = visibleTranslation(fetched ?? message.translation);
  const alreadyInYourLanguage = (fetched ?? message.translation)?.translated === false;

  async function translate() {
    setIsLoading(true);
    setError(null);
    const result = await translateBookingMessage(message.id);
    setIsLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setFetched(result.translation);
  }

  if (translation) {
    return (
      <div className="mt-2 border-t border-ink/10 pt-2">
        <p className="whitespace-pre-line [overflow-wrap:anywhere]">{translation.body}</p>
        <p className="mt-1 text-[0.6875rem] text-ink-soft">{TRANSLATED_BY_AI_LABEL}</p>
      </div>
    );
  }
  if (alreadyInYourLanguage) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => void translate()}
        disabled={isLoading}
        className="text-xs font-medium text-accent-dark underline-offset-2 hover:underline disabled:opacity-60"
      >
        {isLoading ? "Translating…" : "Translate"}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-accent-dark">
          {error}
        </p>
      )}
    </div>
  );
}
