import { describe, expect, it } from "vitest";
import {
  ASSISTANT_TOKEN_NAME_MAX_LENGTH,
  isAssistantTokenExpired,
  validateAssistantTokenName,
} from "./assistant-tokens";

describe("validateAssistantTokenName", () => {
  it("trims the name it accepts", () => {
    expect(validateAssistantTokenName("  Claude Desktop  ")).toEqual({ name: "Claude Desktop" });
  });

  it.each([[""], ["   "], [null], [undefined]])("refuses %j", (value) => {
    expect(validateAssistantTokenName(value)).toHaveProperty("error");
  });

  it("allows the longest name the backend does, and no longer", () => {
    expect(validateAssistantTokenName("x".repeat(ASSISTANT_TOKEN_NAME_MAX_LENGTH))).toHaveProperty("name");
    expect(validateAssistantTokenName("x".repeat(ASSISTANT_TOKEN_NAME_MAX_LENGTH + 1))).toHaveProperty("error");
  });
});

describe("isAssistantTokenExpired", () => {
  const now = new Date("2026-11-02T12:00:00Z");

  it("is false before the expiry and true from it", () => {
    expect(isAssistantTokenExpired({ expires_at: "2026-11-02T12:00:01Z" }, now)).toBe(false);
    expect(isAssistantTokenExpired({ expires_at: "2026-11-02T12:00:00Z" }, now)).toBe(true);
  });
});
