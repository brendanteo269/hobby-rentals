import { describe, expect, it } from "vitest";
import { formatDateRange } from "@/lib/format";

describe("formatDateRange", () => {
  it("says the month and year once when both dates share them", () => {
    expect(formatDateRange("2026-11-11", "2026-11-17")).toBe("11 – 17 Nov 2026");
  });

  it("keeps both months when the range crosses one", () => {
    expect(formatDateRange("2026-11-28", "2026-12-02")).toBe("28 Nov – 2 Dec 2026");
  });

  it("keeps both years when the range crosses one", () => {
    expect(formatDateRange("2026-12-30", "2027-01-02")).toBe("30 Dec 2026 – 2 Jan 2027");
  });

  it("reads a single day as that day twice rather than a bare number", () => {
    expect(formatDateRange("2026-11-11", "2026-11-11")).toBe("11 – 11 Nov 2026");
  });
});
