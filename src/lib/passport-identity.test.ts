import { describe, expect, it } from "vitest";
import { parseSerialClaim, passportBadge, passportEntryLabel } from "@/lib/listings";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  Object.entries(fields).forEach(([name, value]) => data.set(name, value));
  return data;
};

describe("parseSerialClaim", () => {
  it("reads a serial with its label photo", () => {
    expect(parseSerialClaim(form({ serial_photo_key: "k", serial: " AB1 ", serial_extracted: "AB1", serial_confidence: "0.9" })))
      .toEqual({ photo_key: "k", serial: "AB1", extracted: "AB1", confidence: 0.9 });
  });
  it("accepts no serial with a marks photo (S2-32)", () => {
    expect(parseSerialClaim(form({ serial_photo_key: "k", no_serial: "true" })))
      .toEqual({ photo_key: "k", no_serial: true, serial: null, extracted: null, confidence: null });
  });
  it("needs a photo either way, and a serial unless declared without", () => {
    expect(parseSerialClaim(form({ no_serial: "true" }))).toBeNull();
    expect(parseSerialClaim(form({ serial_photo_key: "k" }))).toBeNull();
  });
});

describe("passportBadge (S2-30)", () => {
  it("reserves the card pill for a unique serial", () => {
    expect(passportBadge("VERIFIED")).toBe("Serial verified");
    expect(passportBadge("NO_SERIAL")).toBeNull();
    expect(passportBadge("DUPLICATE")).toBeNull();
    expect(passportBadge("PENDING")).toBeNull();
    expect(passportBadge(null)).toBeNull();
  });
});

describe("passportEntryLabel", () => {
  it("names a no-serial identity entry by what it holds", () => {
    expect(passportEntryLabel({ entry_type: "SERIAL_VERIFICATION", data: { method: "NO_SERIAL" } })).toBe("Distinguishing marks recorded");
    expect(passportEntryLabel({ entry_type: "SERIAL_VERIFICATION", data: {} })).toBe("Serial number recorded");
    expect(passportEntryLabel({ entry_type: "CONDITION_UPDATE", data: { note: "x" } })).toBe("Condition update");
  });
});
