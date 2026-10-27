import { describe, expect, it } from "vitest";
import { needsConfirmation } from "./conversations";

describe("needsConfirmation", () => {
  it("recognises a held message", () => {
    expect(needsConfirmation({ status: "needs_confirmation", confirmation_id: "c1", warnings: [] })).toBe(true);
  });

  it("does not mistake a sent message or a conversation for one", () => {
    expect(needsConfirmation({ id: "m1", body: "hi" })).toBe(false);
    expect(needsConfirmation({ id: "c1", booking_status: "CONFIRMED", read_only: false })).toBe(false);
  });
});
