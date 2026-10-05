import { describe, expect, it } from "vitest";
import { deriveMeetupState } from "@/lib/meetups";
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
    withdrawn_at: null,
    created_at: `2026-10-0${id}T00:00:00+00:00`,
  };
}

function textMessage(id: string): Message {
  return {
    id, conversation_id: "convo-1", sender_id: RENTER_ID, body: "hi", attachment_urls: [],
    meetup_event_type: null, meetup_proposal: null, withdrawn_at: null, created_at: `2026-10-0${id}T00:00:00+00:00`,
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
