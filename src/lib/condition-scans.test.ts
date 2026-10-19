import { describe, expect, it } from "vitest";
import { checklistRows, findingLabel, lightingText, ownerConditionReportPath, scanBadge, type Finding, type ScanAngle } from "@/lib/condition-scans";

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

describe("checklistRows", () => {
  const angle = (overrides: Partial<ScanAngle> = {}): ScanAngle => ({
    angle: "front",
    label: "Front",
    status: "COMPARED",
    reference: "BASELINE",
    return_photo_url: null,
    reference_photo_url: null,
    diff_map_url: null,
    anomaly_score: 0.61,
    alignment: { aligned: true, inliers: 437 },
    conditions: { brightness_change: -0.18, warmth_change: 6, glare_fraction: 0, compared_fraction: 0.92 },
    regions_found: 2,
    dismissed: 1,
    findings: [finding(), finding({ number: 2, damage_type: "STAIN" }), finding({ number: 3, is_wear: true })],
    note: null,
    ...overrides,
  });
  const cell = (rows: ReturnType<typeof checklistRows>, label: string, index = 0) =>
    rows.find((row) => row.label === label)!.cells[index];

  it("shows each step and what was found on a compared side", () => {
    const rows = checklistRows({ angles: [angle()] });
    expect(cell(rows, "Earlier photo")).toEqual({ tone: "ok", text: "Your baseline" });
    expect(cell(rows, "Lined up")).toEqual({ tone: "ok", text: "437 matching points" });
    expect(cell(rows, "Lighting")).toEqual({ tone: "ok", text: "Evened out: 18% darker, warmer light" });
    expect(cell(rows, "Glare ignored").text).toBe("No glare");
    expect(cell(rows, "Area compared").text).toBe("92% of the item");
    expect(cell(rows, "Scratches & cracks")).toEqual({ tone: "found", text: "1 found" });
    expect(cell(rows, "Stains & colour")).toEqual({ tone: "found", text: "1 found" });
    expect(cell(rows, "Dents & shape")).toEqual({ tone: "ok", text: "None" });
    expect(cell(rows, "Normal wear")).toEqual({ tone: "ok", text: "1 found" });
    expect(cell(rows, "False alarms dismissed").text).toBe("1");
    expect(cell(rows, "Difference score").text).toBe("0.61");
  });

  it("says when the AI had to compare without lining up, and when a side had no earlier photo", () => {
    const rows = checklistRows({
      angles: [
        angle({ status: "MODEL_ONLY", alignment: { aligned: false }, conditions: null }),
        angle({ status: "NOT_APPLICABLE", reference: null, findings: [] }),
      ],
    });
    expect(cell(rows, "Lined up", 0)).toEqual({ tone: "found", text: "Couldn't line up - AI compared directly" });
    expect(cell(rows, "Lighting", 0).tone).toBe("none");
    expect(cell(rows, "Earlier photo", 1)).toEqual({ tone: "none", text: "None taken" });
    expect(cell(rows, "Scratches & cracks", 1).text).toBe("—");
  });

  it("calls same-looking light the same", () => {
    expect(lightingText({ brightness_change: 0.02, warmth_change: -1 })).toBe("Same as before");
  });
});
