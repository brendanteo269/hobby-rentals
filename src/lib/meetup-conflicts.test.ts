import { describe, expect, it } from "vitest";
import {
  OTHER_PARTY_CLASH_MESSAGE,
  clashingTimes,
  conflictMessages,
  formatClockTime,
  ownClashMessage,
  toTimeOfDayValue,
  type MeetupConflictCheck,
  type MeetupTimeConflict,
} from "@/lib/meetup-conflicts";

// 10:00 in Singapore (UTC+8).
const TEN_AM_SGT = "2026-10-10T02:00:00Z";

const free: MeetupTimeConflict = {
  time: TEN_AM_SGT,
  own_clash: null,
  other_party_clash: false,
  suggestions: [],
};

describe("formatClockTime", () => {
  it("reads the instant in Singapore time, 24-hour", () => {
    expect(formatClockTime(TEN_AM_SGT)).toBe("10:00");
    expect(toTimeOfDayValue("2026-10-10T07:45:00Z")).toBe("15:45");
  });
});

describe("conflictMessages", () => {
  it("names the viewer's own clashing item and time", () => {
    expect(ownClashMessage("Tent", TEN_AM_SGT)).toBe(
      "Clashes with your meetup for Tent at 10:00",
    );
  });

  it("gives only the generic line for the other party", () => {
    const lines = conflictMessages({ ...free, other_party_clash: true });
    expect(lines).toEqual([OTHER_PARTY_CLASH_MESSAGE]);
  });

  it("lists both when both apply, own first", () => {
    const lines = conflictMessages({
      ...free,
      own_clash: { item_name: "Tent", time: TEN_AM_SGT },
      other_party_clash: true,
    });
    expect(lines).toEqual([
      "Clashes with your meetup for Tent at 10:00",
      OTHER_PARTY_CLASH_MESSAGE,
    ]);
  });

  it("is empty for a free time", () => {
    expect(conflictMessages(free)).toEqual([]);
  });
});

describe("clashingTimes", () => {
  it("keeps only the times with a clash", () => {
    const check: MeetupConflictCheck = {
      blocked_reason: null,
      times: [free, { ...free, other_party_clash: true }],
    };
    expect(clashingTimes(check)).toHaveLength(1);
  });
});
