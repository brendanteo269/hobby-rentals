import { describe, expect, it } from "vitest";
import { responseTimeLabel } from "@/lib/response-time";

describe("responseTimeLabel", () => {
  it("words each band as a renter reads it", () => {
    expect(responseTimeLabel("HOUR")).toBe("Usually replies within an hour");
    expect(responseTimeLabel("FEW_HOURS")).toBe("Usually replies within a few hours");
    expect(responseTimeLabel("DAY")).toBe("Usually replies within a day");
    expect(responseTimeLabel("FEW_DAYS")).toBe("Usually replies within a few days");
  });

  it("shows nothing without enough history or for a band it does not know", () => {
    expect(responseTimeLabel(null)).toBeNull();
    expect(responseTimeLabel(undefined)).toBeNull();
    expect(responseTimeLabel("WEEK")).toBeNull();
  });
});
