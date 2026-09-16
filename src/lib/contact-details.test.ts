/**
 * The onboarding and profile validation rules (S1-02).
 *
 * The role-conditional part is the interesting bit: which location a member
 * must give depends on which sides of the marketplace they are on, and getting
 * that wrong either blocks a valid signup or lets an owner through with no
 * pickup point. Neither failure throws, so only a test catches it.
 */

import { describe, expect, it } from "vitest";
import {
  inheritedLocation,
  parseContactDetails,
  validateDisplayName,
  type Roles,
} from "@/lib/contact-details";

const RENTER: Roles = { wantsToRent: true, wantsToOwn: false };
const OWNER: Roles = { wantsToRent: false, wantsToOwn: true };
const BOTH: Roles = { wantsToRent: true, wantsToOwn: true };

/** Builds the form a member would submit, with overrides for the field under test. */
function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  data.set("contact_number", "9123 4567");
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("validateDisplayName", () => {
  it("accepts an ordinary name", () => {
    expect(validateDisplayName("Alex Tan")).toBeNull();
  });

  it("rejects an empty name", () => {
    expect(validateDisplayName("")).not.toBeNull();
  });

  it("rejects a name over 60 characters", () => {
    expect(validateDisplayName("a".repeat(61))).not.toBeNull();
    expect(validateDisplayName("a".repeat(60))).toBeNull();
  });
});

describe("parseContactDetails — role-conditional locations", () => {
  it("requires a meetup location from a renter, and no pickup location", () => {
    const result = parseContactDetails(form({}), RENTER);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors.preferred_meetup_location).toBeDefined();
    expect(result.fieldErrors.default_pickup_location).toBeUndefined();
  });

  it("requires a pickup location from an owner, and no meetup location", () => {
    const result = parseContactDetails(form({}), OWNER);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors.default_pickup_location).toBeDefined();
    expect(result.fieldErrors.preferred_meetup_location).toBeUndefined();
  });

  it("requires both from a member who does both", () => {
    const result = parseContactDetails(form({}), BOTH);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.fieldErrors).sort()).toEqual([
      "default_pickup_location",
      "preferred_meetup_location",
    ]);
  });

  it("accepts a renter who gives only a meetup location", () => {
    const result = parseContactDetails(
      form({ preferred_meetup_location: "BUKIT_TIMAH" }),
      RENTER,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.preferred_meetup_location).toBe("BUKIT_TIMAH");
    // Not "": a role the member does not hold reads as null, like every other
    // unanswered column on profiles.
    expect(result.values.default_pickup_location).toBeNull();
  });

  it("keeps the two locations apart for a member who does both", () => {
    const result = parseContactDetails(
      form({
        preferred_meetup_location: "BUKIT_TIMAH",
        default_pickup_location: "EAST_COAST",
      }),
      BOTH,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.preferred_meetup_location).toBe("BUKIT_TIMAH");
    expect(result.values.default_pickup_location).toBe("EAST_COAST");
  });
});

describe("parseContactDetails — contact number", () => {
  it.each(["9123 4567", "+65 9123 4567", "(65) 9123-4567"])("accepts %s", (number) => {
    const result = parseContactDetails(
      form({ contact_number: number, preferred_meetup_location: "BUKIT_TIMAH" }),
      RENTER,
    );
    expect(result.ok).toBe(true);
  });

  it.each([
    ["", "empty"],
    ["abc", "letters"],
    ["12345", "too short"],
    ["1".repeat(21), "too long"],
  ])("rejects %s (%s)", (number) => {
    const result = parseContactDetails(
      form({ contact_number: number, preferred_meetup_location: "BUKIT_TIMAH" }),
      RENTER,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors.contact_number).toBeDefined();
  });
});

describe("parseContactDetails — reporting", () => {
  it("reports every invalid field at once, not just the first", () => {
    // The behaviour that stops a member fixing one error only to be shown the
    // next on resubmission.
    const result = parseContactDetails(
      form({ contact_number: "abc", bio: "x".repeat(501) }),
      BOTH,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.fieldErrors).sort()).toEqual([
      "bio",
      "contact_number",
      "default_pickup_location",
      "preferred_meetup_location",
    ]);
  });

  it("keys errors by the field name the form uses", () => {
    // The keys are what the form indexes into, so a rename here silently stops
    // any message rendering.
    const result = parseContactDetails(form({ contact_number: "" }), OWNER);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    for (const key of Object.keys(result.fieldErrors)) {
      expect(key).toMatch(/^(contact_number|preferred_meetup_location|default_pickup_location|bio)$/);
    }
  });

  it("treats an optional bio as absent rather than empty", () => {
    const result = parseContactDetails(
      form({ bio: "   ", preferred_meetup_location: "BUKIT_TIMAH" }),
      RENTER,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.bio).toBeNull();
  });
});

describe("inheritedLocation", () => {
  it("gives a new owner their meetup location as a pickup default", () => {
    // Without this, clicking "start owning" produces an owner with nowhere to
    // hand gear over — the member onboarding refuses to create.
    expect(
      inheritedLocation("wants_to_own", {
        preferred_meetup_location: "BUKIT_TIMAH",
        default_pickup_location: null,
      }),
    ).toEqual({ column: "default_pickup_location", value: "BUKIT_TIMAH" });
  });

  it("gives a new renter their pickup location as a meetup default", () => {
    expect(
      inheritedLocation("wants_to_rent", {
        preferred_meetup_location: null,
        default_pickup_location: "EAST_COAST",
      }),
    ).toEqual({ column: "preferred_meetup_location", value: "EAST_COAST" });
  });

  it("never overwrites an answer the member already gave", () => {
    expect(
      inheritedLocation("wants_to_own", {
        preferred_meetup_location: "BUKIT_TIMAH",
        default_pickup_location: "SENTOSA",
      }),
    ).toBeNull();
  });

  it("does nothing when there is no answer to borrow", () => {
    expect(
      inheritedLocation("wants_to_own", {
        preferred_meetup_location: null,
        default_pickup_location: null,
      }),
    ).toBeNull();
  });
});
