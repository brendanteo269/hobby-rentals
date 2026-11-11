import { describe, expect, it } from "vitest";
import { base64ToBytes, canDownloadReceipt } from "./receipts";

describe("canDownloadReceipt", () => {
  it.each(["CONFIRMED", "ACTIVE", "COMPLETED"])("offers a receipt once %s", (status) => {
    expect(canDownloadReceipt({ status })).toBe(true);
  });

  it.each(["PENDING", "DECLINED", "CANCELLED", "EXPIRED"])("offers none while %s", (status) => {
    expect(canDownloadReceipt({ status })).toBe(false);
  });
});

describe("base64ToBytes", () => {
  it("restores the file's bytes exactly", () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x00, 0xff, 0x80]);
    const encoded = Buffer.from(bytes).toString("base64");
    expect(Array.from(base64ToBytes(encoded))).toEqual(Array.from(bytes));
  });
});
