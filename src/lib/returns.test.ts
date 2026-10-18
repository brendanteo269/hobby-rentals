import { describe, expect, it } from "vitest";
import { acceptedCount, canStartReturnInspection, clientUtcOffsetMinutes, type InspectionAngle } from "@/lib/returns";

describe("canStartReturnInspection", () => {
  it("allows an active rental", () => {
    expect(canStartReturnInspection({ status: "ACTIVE" })).toBe(true);
  });

  it.each(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "DECLINED", "EXPIRED"] as const)(
    "refuses a %s booking: there is nothing out to return",
    (status) => {
      expect(canStartReturnInspection({ status })).toBe(false);
    },
  );
});

describe("clientUtcOffsetMinutes", () => {
  it("is east-positive, the opposite sign of getTimezoneOffset", () => {
    const singapore = { getTimezoneOffset: () => -480 } as Date;
    expect(clientUtcOffsetMinutes(singapore)).toBe(480);
  });
});

describe("acceptedCount", () => {
  const angle = (accepted: boolean): InspectionAngle => ({
    angle: "front",
    label: "Front",
    baseline_overlay_url: null,
    accepted_photo: accepted
      ? { id: "p", inspection_id: "i", angle: "front", photo_key: "k", photo_url: "u", outcome: "ACCEPTED", received_at: "t" }
      : null,
    last_rejection: null,
  });

  it("counts only the angles with an accepted photo", () => {
    expect(acceptedCount({ angles: [angle(true), angle(false), angle(true), angle(false)] })).toBe(2);
  });
});
