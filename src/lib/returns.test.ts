import { describe, expect, it } from "vitest";
import {
  acceptedCount,
  canConfirmReturn,
  canStartReturnInspection,
  clientUtcOffsetMinutes,
  returnStatusLine,
  type InspectionAngle,
  type ReturnState,
} from "@/lib/returns";

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

describe("S3-04 return confirmation", () => {
  const at = "2026-10-18T09:00:00+00:00";
  const state = (overrides: Partial<ReturnState> = {}): ReturnState => ({
    inspection_status: "COMPLETED",
    renter_confirmed_at: null,
    owner_confirmed_at: null,
    ...overrides,
  });

  it("offers each side its confirmation only while the rental is active and theirs is outstanding", () => {
    const active = { status: "ACTIVE" as const, return_state: state({ renter_confirmed_at: at }) };
    expect(canConfirmReturn(active, "renter")).toBe(false);
    expect(canConfirmReturn(active, "owner")).toBe(true);
    expect(canConfirmReturn({ status: "COMPLETED", return_state: state() }, "owner")).toBe(false);
    expect(canConfirmReturn({ status: "ACTIVE", return_state: null }, "owner")).toBe(false);
  });

  it("tells the owner the photos come first", () => {
    expect(returnStatusLine(state({ inspection_status: null }), "owner")).toMatch(/return photos are needed/);
    expect(returnStatusLine(state({ inspection_status: "IN_PROGRESS" }), "renter")).toMatch(/Finish the return photos/);
    expect(returnStatusLine(state({ inspection_status: null }), "renter")).toBeNull();
  });

  it("says whose confirmation is still outstanding", () => {
    expect(returnStatusLine(state({ renter_confirmed_at: at }), "renter")).toMatch(/Waiting for the owner to confirm/);
    expect(returnStatusLine(state({ renter_confirmed_at: at }), "owner")).toMatch(/The renter confirmed the return/);
    expect(returnStatusLine(state({ owner_confirmed_at: at }), "renter")).toMatch(/Confirm it too/);
    expect(returnStatusLine(state(), "owner")).toMatch(/Check the item, then confirm/);
    expect(returnStatusLine(state({ renter_confirmed_at: at, owner_confirmed_at: at }), "owner")).toBeNull();
  });
});
