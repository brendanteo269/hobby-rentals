import { describe, expect, it } from "vitest";
import { combineWarnings } from "./message-warnings";

const contact = { kind: "CONTACT_DETAILS", title: "This looks like it shares contact details", detail: "It seems to include a phone number." } as const;
const ai = { kind: "AI_CONCERN", title: "This message may be unsafe", detail: "Automated check flagged a scam. This may be incorrect." } as const;

describe("combineWarnings", () => {
  it("keeps a single contact concern's own heading and text", () => {
    expect(combineWarnings([contact])).toEqual({ title: contact.title, body: contact.detail, note: "" });
  });

  it("puts the automated check on its own small line under the main text", () => {
    expect(combineWarnings([contact, ai])).toEqual({
      title: "Please review before sending",
      body: contact.detail,
      note: ai.detail,
    });
  });

  it("uses the automated check's sentence as the paragraph when it is the only concern", () => {
    expect(combineWarnings([ai])).toEqual({ title: ai.title, body: ai.detail, note: "" });
  });
});
