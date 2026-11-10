/**
 * S6-04: the languages chat can be translated into, and the shapes the
 * translation routes return. The translating itself happens on the server;
 * this is only what the settings form and the message bubble need to know.
 */

export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "zh", label: "中文 (Chinese)" },
  { value: "ms", label: "Bahasa Melayu (Malay)" },
  { value: "ta", label: "தமிழ் (Tamil)" },
] as const;

export type Language = (typeof LANGUAGES)[number]["value"];

/** What the member chose in their profile (Scenarios 1 and 3). */
export type LanguagePreferences = {
  preferred_language: Language | null;
  always_translate: boolean;
};

/** A message's translation for its reader, shown under the original (Scenario 2). */
export type MessageTranslation = {
  target_lang: Language;
  source_lang: string;
  body: string;
  /** False when the message was already in the reader's language: there is nothing to show. */
  translated: boolean;
  label: string;
};

/** The label every translation carries, so nobody mistakes it for the sender's own words. */
export const TRANSLATED_BY_AI_LABEL = "Translated by AI";

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((language) => language.value === value);
}

/**
 * Whether a message gets a Translate button: only a plain-text message from the
 * other person, and only once the reader has chosen a language to translate into.
 */
export function canOfferTranslation(
  message: { sender_id: string; body: string; meetup_event_type: string | null },
  currentUserId: string,
  readerHasLanguage: boolean,
): boolean {
  return (
    readerHasLanguage &&
    message.sender_id !== currentUserId &&
    message.body.trim().length > 0 &&
    message.meetup_event_type === null
  );
}

/** The translation worth showing under a message, or null when it is missing or the message needed none. */
export function visibleTranslation(translation: MessageTranslation | null | undefined): MessageTranslation | null {
  return translation && translation.translated ? translation : null;
}
