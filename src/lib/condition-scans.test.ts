import { describe, expect, it } from "vitest";
import { findingLabel, ownerConditionReportPath, scanBadge, type Finding } from "@/lib/condition-scans";

const finding = (overrides: Partial<Finding> = {}): Finding => ({
  number: 1,
  box: null,
  damage_type: "SCRATCH",
  severity: "MODERATE",
  is_wear: false,
  summary: "A thin scratch on the centre of the front.",
  confidence: 0.9,
  classified: true,
  ...overrides,
});

describe("scanBadge", () => {
  it("says where a scan stands, loudest when the owner has something to do", () => {
    expect(scanBadge({ id: "s", status: "PROCESSING", verdict: null })).toEqual({ label: "AI check running", tone: "neutral" });
    expect(scanBadge({ id: "s", status: "COMPLETED", verdict: "CLEAR" })).toEqual({ label: "No damage found", tone: "dark" });
    expect(scanBadge({ id: "s", status: "COMPLETED", verdict: "DAMAGE_DETECTED" })).toEqual({ label: "Possible damage", tone: "accent" });
    expect(scanBadge({ id: "s", status: "FAILED", verdict: null })).toEqual({ label: "AI check needs you", tone: "accent" });
  });
});

describe("findingLabel", () => {
  it("names the kind and severity of a classified change", () => {
    expect(findingLabel(finding())).toBe("Scratch · Moderate");
  });

  it("calls wear wear, whatever its kind", () => {
    expect(findingLabel(finding({ is_wear: true }))).toBe("Normal wear");
  });

  it("owns up when the AI could not classify a change", () => {
    expect(findingLabel(finding({ classified: false, damage_type: null, severity: null }))).toBe("Unclassified change");
  });
});

it("builds the owner's condition report path", () => {
  expect(ownerConditionReportPath("b1")).toBe("/listings/mine/bookings/b1/condition");
});
