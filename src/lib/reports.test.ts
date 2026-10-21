import { describe, expect, it } from "vitest";
import { USER_REPORT_REASONS, userReportPath, userReportReasonLabel } from "@/lib/reports";

describe("user report reasons", () => {
  it("offers each reason once, with a label", () => {
    const values = USER_REPORT_REASONS.map((option) => option.value);
    expect(new Set(values).size).toBe(values.length);
    expect(USER_REPORT_REASONS.every((option) => option.label.length > 0)).toBe(true);
  });
  it("labels a reason, and falls back to the code for one it does not know", () => {
    expect(userReportReasonLabel("THREATS")).toBe("Threats");
    expect(userReportReasonLabel("NEW_ONE" as never)).toBe("NEW_ONE");
  });
  it("links to a report's page", () => {
    expect(userReportPath("abc")).toBe("/reports/abc");
  });
});
