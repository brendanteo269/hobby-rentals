import { describe, expect, it } from "vitest";
import { combineDateAndTime, composeMeetupLocation, deriveMeetupState, upcomingDates } from "@/lib/meetups";
import type { Message } from "@/lib/conversations";

const RENTER_ID = "renter-1";
const OWNER_ID = "owner-1";

function proposalMessage(id: string, overrides: Partial<NonNullable<Message["meetup_proposal"]>> = {}): Message {
  return {
    id,
    conversation_id: "convo-1",
    sender_id: RENTER_ID,
    body: "",
    attachment_urls: [],
    meetup_event_type: "PROPOSED",
    meetup_proposal: {
      id: `proposal-${id}`,
      location: "Tampines MRT",
      proposed_times: ["2026-10-10T15:00:00+00:00"],
      proposed_by: RENTER_ID,
      accepted_time: null,
      accepted_by: null,
      accepted_at: null,
      ...overrides,
    },
    created_at: `2026-10-0${id}T00:00:00+00:00`,
  };
}

function textMessage(id: string): Message {
  return {
    id, conversation_id: "convo-1", sender_id: RENTER_ID, body: "hi", attachment_urls: [],
    meetup_event_type: null, meetup_proposal: null, created_at: `2026-10-0${id}T00:00:00+00:00`,
  };
}

describe("deriveMeetupState", () => {
  it("is empty with no meetup messages", () => {
    expect(deriveMeetupState([textMessage("1")])).toEqual({ confirmed: null, pending: null });
  });

  it("treats an unaccepted proposal as pending, not confirmed", () => {
    const state = deriveMeetupState([textMessage("1"), proposalMessage("2")]);
    expect(state.confirmed).toBeNull();
    expect(state.pending?.id).toBe("proposal-2");
  });

  it("treats an accepted proposal as confirmed, not pending", () => {
    const state = deriveMeetupState([
      proposalMessage("1", { accepted_time: "2026-10-10T15:00:00+00:00", accepted_by: OWNER_ID }),
    ]);
    expect(state.pending).toBeNull();
    expect(state.confirmed?.accepted_by).toBe(OWNER_ID);
  });

  it("keeps the old confirmed arrangement visible while a newer proposal is still pending (Scenario 5)", () => {
    const state = deriveMeetupState([
      proposalMessage("1", { accepted_time: "2026-10-10T15:00:00+00:00", accepted_by: OWNER_ID }),
      proposalMessage("2"),
    ]);
    expect(state.confirmed?.id).toBe("proposal-1");
    expect(state.pending?.id).toBe("proposal-2");
  });

  it("supersedes a declined proposal once a new one is sent", () => {
    const state = deriveMeetupState([proposalMessage("1"), proposalMessage("2")]);
    expect(state.pending?.id).toBe("proposal-2");
  });
});

describe("combineDateAndTime", () => {
  it("combines a date and a 15-minute slot into an ISO instant", () => {
    expect(combineDateAndTime("2026-10-14", "13:45")).toBe(new Date("2026-10-14T13:45").toISOString());
  });

  it("is null when the date is missing", () => {
    expect(combineDateAndTime("", "13:45")).toBeNull();
  });

  it("is null when the time is missing", () => {
    expect(combineDateAndTime("2026-10-14", "")).toBeNull();
  });

  it("is null for an unparseable combination", () => {
    expect(combineDateAndTime("not-a-date", "13:45")).toBeNull();
  });
});

describe("composeMeetupLocation", () => {
  it("uses the area's label alone when there's no detail", () => {
    expect(composeMeetupLocation({ mode: "area", area: "JURONG_EAST", detail: "" })).toBe("Jurong East");
  });

  it("appends a trimmed exit/meeting-point detail to the area's label", () => {
    expect(composeMeetupLocation({ mode: "area", area: "JURONG_EAST", detail: "  Exit 3  " })).toBe(
      "Jurong East, Exit 3",
    );
  });

  it("is blank when no area is chosen", () => {
    expect(composeMeetupLocation({ mode: "area", area: "", detail: "Exit 3" })).toBe("");
  });

  it("uses the trimmed custom address as-is", () => {
    expect(composeMeetupLocation({ mode: "custom", address: "  123 Example St  " })).toBe("123 Example St");
  });
});

describe("upcomingDates", () => {
  it("starts from the given day and runs for the requested count, ascending", () => {
    expect(upcomingDates(4, new Date(2026, 9, 30))).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
  });

  it("returns just the one day for a count of 1", () => {
    expect(upcomingDates(1, new Date(2026, 0, 1))).toEqual(["2026-01-01"]);
  });
});
