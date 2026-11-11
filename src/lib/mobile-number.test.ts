/**
 * The mobile number rules. Getting normalisation wrong either refuses a real
 * member's number or sends a paid text to a number we meant to refuse, and
 * neither failure throws.
 */

import { describe, expect, it } from "vitest";
import {
  formatSingaporeMobile,
  mobileVerificationErrorMessage,
  normaliseSingaporeMobile,
  verificationCodeError,
} from "@/lib/mobile-number";

describe("normaliseSingaporeMobile", () => {
  it.each([
    ["91234567", "+6591234567"],
    ["9123 4567", "+6591234567"],
    ["8123-4567", "+6581234567"],
    ["+65 9123 4567", "+6591234567"],
    ["+65 (9123) 4567", "+6591234567"],
    ["6591234567", "+6591234567"],
    [" 9123 4567 ", "+6591234567"],
  ])("accepts %s", (input, expected) => {
    expect(normaliseSingaporeMobile(input)).toBe(expected);
  });

  it.each([
    ["", "empty"],
    ["61234567", "a landline"],
    ["31234567", "a VoIP number"],
    ["9123456", "too short"],
    ["912345678", "too long"],
    ["+44 7911 123456", "a foreign number"],
    ["+91234567", "a + without the country code"],
    ["9123abcd", "letters"],
    ["+6561234567", "a landline with the country code"],
  ])("refuses %s (%s)", (input) => {
    expect(normaliseSingaporeMobile(input)).toBeNull();
  });
});

describe("formatSingaporeMobile", () => {
  it("groups a Singapore number", () => {
    expect(formatSingaporeMobile("+6591234567")).toBe("+65 9123 4567");
  });

  it("leaves anything else as it was typed", () => {
    // Numbers typed before verification existed are shown untouched.
    expect(formatSingaporeMobile("(65) 9123-4567")).toBe("(65) 9123-4567");
  });
});

describe("verificationCodeError", () => {
  it("accepts six digits", () => {
    expect(verificationCodeError("123456")).toBeNull();
  });

  it.each(["", "12345", "1234567", "12a456"])("refuses %s", (code) => {
    expect(verificationCodeError(code)).not.toBeNull();
  });
});

describe("mobileVerificationErrorMessage", () => {
  it("explains a number taken by another account", () => {
    expect(mobileVerificationErrorMessage({ code: "phone_exists", message: "x" })).toMatch(/another account/);
  });

  it("passes on how long to wait before resending", () => {
    const message = "For security purposes, you can only request this after 42 seconds.";
    expect(mobileVerificationErrorMessage({ code: "over_sms_send_rate_limit", message })).toBe(message);
  });

  it("never shows an unrecognised Auth message", () => {
    expect(mobileVerificationErrorMessage({ code: "unexpected_failure", message: "pq: internal" })).not.toMatch(/pq/);
  });
});
