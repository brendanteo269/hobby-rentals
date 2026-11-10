import "server-only";

import { backendRequest } from "@/lib/api/client";
import type { LanguagePreferences, MessageTranslation } from "@/lib/translation";

/** Mirrors the FastAPI routes in app/routers/translation.py. */

/** S6-04: the member's preferred language and Always-translate switch. */
export function getLanguagePreferences() {
  return backendRequest<LanguagePreferences>("/translation/preferences");
}

export function updateLanguagePreferences(preferences: LanguagePreferences) {
  return backendRequest<LanguagePreferences>("/translation/preferences", {
    method: "PUT",
    body: JSON.stringify(preferences),
  });
}

/** Translates one received message into the member's preferred language. */
export function translateMessage(messageId: string) {
  return backendRequest<MessageTranslation>(`/messages/${encodeURIComponent(messageId)}/translate`, {
    method: "POST",
  });
}
