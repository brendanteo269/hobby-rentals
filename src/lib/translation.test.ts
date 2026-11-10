import { describe, expect, it } from "vitest";
import {
  LANGUAGES,
  canOfferTranslation,
  isLanguage,
  visibleTranslation,
  type MessageTranslation,
} from "@/lib/translation";

const incoming = { sender_id: "them", body: "Boleh ambil esok?", meetup_event_type: null };

describe("languages", () => {
  it("offers exactly English, Chinese, Malay and Tamil", () => {
    expect(LANGUAGES.map((language) => language.value)).toEqual(["en", "zh", "ms", "ta"]);
    expect(isLanguage("ta")).toBe(true);
    expect(isLanguage("fr")).toBe(false);
  });
});

describe("canOfferTranslation", () => {
  it("is for the other person's text, once a language is chosen", () => {
    expect(canOfferTranslation(incoming, "me", true)).toBe(true);
  });

  it("is not offered without a chosen language", () => {
    expect(canOfferTranslation(incoming, "me", false)).toBe(false);
  });

  it("is not offered for your own messages, empty bodies or meetup cards", () => {
    expect(canOfferTranslation({ ...incoming, sender_id: "me" }, "me", true)).toBe(false);
    expect(canOfferTranslation({ ...incoming, body: "  " }, "me", true)).toBe(false);
    expect(canOfferTranslation({ ...incoming, meetup_event_type: "PROPOSED" }, "me", true)).toBe(false);
  });
});

describe("visibleTranslation", () => {
  const translation: MessageTranslation = {
    target_lang: "en",
    source_lang: "ms",
    body: "Can I pick up tomorrow?",
    translated: true,
    label: "Translated by AI",
  };

  it("shows a real translation", () => {
    expect(visibleTranslation(translation)).toBe(translation);
  });

  it("shows nothing when the message was already in the reader's language, or there is none", () => {
    expect(visibleTranslation({ ...translation, translated: false })).toBeNull();
    expect(visibleTranslation(null)).toBeNull();
    expect(visibleTranslation(undefined)).toBeNull();
  });
});
