import { describe, expect, it } from "vitest";
import { wantsReplySuggestions } from "./conversations";

const OWNER = "owner";
const RENTER = "renter";
const said = (sender_id: string, body: string) => ({ sender_id, body });

describe("wantsReplySuggestions", () => {
  it("is true for the owner when the renter wrote last", () => {
    expect(wantsReplySuggestions([said(OWNER, "Hi"), said(RENTER, "Is it free on 20 Nov?")], OWNER, true)).toBe(true);
  });

  it("is false once the owner has replied", () => {
    expect(wantsReplySuggestions([said(RENTER, "Is it free?"), said(OWNER, "Yes!")], OWNER, true)).toBe(false);
  });

  it("is never true for the renter", () => {
    expect(wantsReplySuggestions([said(OWNER, "Hi there")], RENTER, false)).toBe(false);
  });

  it("is false for a photo with no text, or an empty thread", () => {
    expect(wantsReplySuggestions([said(RENTER, "  ")], OWNER, true)).toBe(false);
    expect(wantsReplySuggestions([], OWNER, true)).toBe(false);
  });
});
