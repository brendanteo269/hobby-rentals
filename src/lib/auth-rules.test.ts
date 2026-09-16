/**
 * The validation rules and allowlists that stand between a stranger and an
 * account (S1-01).
 *
 * These are pure functions with no I/O, which is exactly why they are worth
 * pinning: each one is a single boolean decision that is invisible when it
 * goes wrong. A loosened password rule or a notice allowlist that stops
 * allowlisting does not throw, it just quietly stops protecting anything.
 */

import { describe, expect, it } from "vitest";
import { validateEmail } from "@/lib/email";
import {
  validateNewPassword,
  validatePasswordChange,
  validatePasswordComplexity,
} from "@/lib/password";
import { loginNotice } from "@/lib/session-policy";
import {
  authErrorPath,
  checkEmailPath,
  defaultProfileView,
  isProfileView,
  loginPath,
  profilePath,
} from "@/lib/routes";
import { requiresOnboarding, requiresVerifiedEmail } from "@/lib/route-policy";

describe("validateEmail", () => {
  it.each(["a@b.co", "first.last@example.com", "user+tag@sub.domain.org"])(
    "accepts %s",
    (email) => {
      expect(validateEmail(email)).toBeNull();
    },
  );

  it.each([
    ["", "empty"],
    ["not-an-email", "no @"],
    ["no-domain@", "no domain"],
    ["@no-local.com", "no local part"],
    ["spaces in@example.com", "whitespace"],
    ["no-tld@example", "no dot in the domain"],
    ["two@@example.com", "two @ signs"],
  ])("rejects %s (%s)", (email) => {
    expect(validateEmail(email)).not.toBeNull();
  });

  it("rejects an address longer than any mail server accepts", () => {
    expect(validateEmail(`${"a".repeat(250)}@example.com`)).not.toBeNull();
  });
});

describe("validatePasswordComplexity", () => {
  it("accepts a password meeting every rule", () => {
    expect(validatePasswordComplexity("Passw0rdy")).toBeNull();
  });

  it.each([
    ["Pass1", "shorter than 8"],
    ["password1", "no uppercase"],
    ["PASSWORD1", "no lowercase"],
    ["PasswordOnly", "no digit"],
  ])("rejects %s (%s)", (password) => {
    expect(validatePasswordComplexity(password)).not.toBeNull();
  });

  it("names the rule that was broken, so the member can act on it", () => {
    expect(validatePasswordComplexity("password1")).toMatch(/uppercase/i);
    expect(validatePasswordComplexity("PasswordOnly")).toMatch(/number/i);
  });
});

describe("loginNotice", () => {
  it("resolves the reasons the app actually sets", () => {
    expect(loginNotice("expired")?.tone).toBe("error");
    expect(loginNotice("signed-out")?.tone).toBe("error");
    expect(loginNotice("verified")?.tone).toBe("success");
  });

  it("ignores anything not on the allowlist", () => {
    // The whole point: ?reason= is attacker-controlled, so a crafted link must
    // not be able to place its own text above the password field.
    expect(loginNotice("Your account was suspended, call 555-0100")).toBeUndefined();
    expect(loginNotice(undefined)).toBeUndefined();
  });

  it("does not resolve inherited Object properties", () => {
    // `reason in NOTICES` walks the prototype chain, so these must not slip by.
    expect(loginNotice("constructor")).toBeUndefined();
    expect(loginNotice("toString")).toBeUndefined();
  });
});

describe("route builders", () => {
  it("builds a login path with and without a reason", () => {
    expect(loginPath()).toBe("/login");
    expect(loginPath("verified")).toBe("/login?reason=verified");
  });

  it("round-trips a reason through loginNotice", () => {
    // Guards the pairing itself: the writer and the reader must agree on the
    // spelling, and this is the only place that checks they do.
    expect(loginNotice(new URL(loginPath("expired"), "http://x").searchParams.get("reason")!))
      .toBeDefined();
  });

  it("escapes the email in a check-email path", () => {
    expect(checkEmailPath("a+b@example.com")).toBe("/check-email?email=a%2Bb%40example.com");
    expect(checkEmailPath(undefined)).toBe("/check-email");
  });

  it("builds an auth error path from a code", () => {
    expect(authErrorPath("link-invalid")).toBe("/auth-error?reason=link-invalid");
  });
});

describe("requiresVerifiedEmail", () => {
  it.each(["/listings/new", "/listings/abc-123/availability"])(
    "gates the lending action %s",
    (path) => {
      expect(requiresVerifiedEmail(path)).toBe(true);
    },
  );

  it.each([
    ["/browse", "browsing is not an action"],
    ["/listings", "the index is a read"],
    ["/listings/abc-123", "a listing detail page is a read"],
    ["/profile", "the member's own profile"],
    ["/onboarding", "first-run setup must stay reachable"],
    ["/", "the marketing home page"],
  ])("leaves %s open (%s)", (path) => {
    expect(requiresVerifiedEmail(path)).toBe(false);
  });

  it("does not gate a path that merely mentions an action elsewhere", () => {
    expect(requiresVerifiedEmail("/browse?q=/listings/new")).toBe(false);
  });
});

describe("requiresOnboarding", () => {
  it.each(["/profile", "/browse", "/listings", "/listings/new", "/listings/abc/availability"])(
    "gates %s",
    (path) => {
      expect(requiresOnboarding(path)).toBe(true);
    },
  );

  it("never gates /onboarding itself", () => {
    // The redirect target. Gating it would bounce a member between the gate
    // and the form forever, with no way to complete either.
    expect(requiresOnboarding("/onboarding")).toBe(false);
  });

  it.each(["/", "/login", "/signup", "/check-email", "/auth-error"])(
    "leaves %s open",
    (path) => {
      expect(requiresOnboarding(path)).toBe(false);
    },
  );
});

describe("defaultProfileView", () => {
  it("sends an owner-only member to the owning side", () => {
    expect(defaultProfileView({ wantsToRent: false, wantsToOwn: true })).toBe("owner");
  });

  it("sends renters, and members who do both, to the renting side", () => {
    expect(defaultProfileView({ wantsToRent: true, wantsToOwn: false })).toBe("renter");
    expect(defaultProfileView({ wantsToRent: true, wantsToOwn: true })).toBe("renter");
  });
});

describe("profilePath", () => {
  it("builds a path per panel, and a bare one with no view", () => {
    expect(profilePath()).toBe("/profile");
    expect(profilePath("owner")).toBe("/profile?view=owner");
  });

  it("round-trips through isProfileView", () => {
    // The writer and the reader must agree on the spelling; this is the only
    // place that checks they do.
    const view = new URL(profilePath("wallet"), "http://x").searchParams.get("view");
    expect(isProfileView(view ?? undefined)).toBe(true);
  });

  it("rejects a view that is not a panel", () => {
    expect(isProfileView("admin")).toBe(false);
    expect(isProfileView(undefined)).toBe(false);
  });
});

describe("validatePasswordChange", () => {
  const VALID = "Passw0rdy";

  it("accepts a well-formed change", () => {
    expect(validatePasswordChange("OldPass1", VALID, VALID)).toEqual({});
  });

  it("puts each rule under the box it belongs to", () => {
    // Which field a message appears beneath is the whole point of S1-03 AC3:
    // "passwords do not match" under the current-password box reads as an
    // accusation rather than an instruction.
    expect(validatePasswordChange("", VALID, VALID)).toHaveProperty("current_password");
    expect(validatePasswordChange("OldPass1", "short", "short")).toHaveProperty("new_password");
    expect(validatePasswordChange("OldPass1", VALID, "Different1")).toHaveProperty(
      "confirm_password",
    );
  });

  it("flags a new password identical to the current one", () => {
    expect(validatePasswordChange(VALID, VALID, VALID).new_password).toMatch(/same/i);
  });

  it("prefers the complexity message over the same-as-current one", () => {
    // Both are true for "abc" if the current password is also "abc"; the
    // actionable one is the rule that was broken.
    expect(validatePasswordChange("abc", "abc", "abc").new_password).toMatch(/8 characters/);
  });

  it("reports every empty box at once", () => {
    expect(Object.keys(validatePasswordChange("", "", "")).sort()).toEqual([
      "confirm_password",
      "current_password",
      "new_password",
    ]);
  });

  it("does not pile complexity errors onto an empty new password", () => {
    // An empty form should say "fill these in", not also lecture about
    // uppercase letters in a box with nothing in it.
    const errors = validatePasswordChange("OldPass1", "", "");
    expect(errors.new_password).toMatch(/enter a new password/i);
  });
});

describe("validateNewPassword", () => {
  const VALID = "Passw0rdy";

  it("accepts a well-formed pair", () => {
    expect(validateNewPassword(VALID, VALID)).toEqual({});
  });

  it("puts each rule under the box it belongs to", () => {
    expect(validateNewPassword("short", "short")).toHaveProperty("new_password");
    expect(validateNewPassword(VALID, "Different1")).toHaveProperty("confirm_password");
  });

  it("reports both empty boxes at once", () => {
    expect(Object.keys(validateNewPassword("", "")).sort()).toEqual([
      "confirm_password",
      "new_password",
    ]);
  });

  it("has no opinion about a current password", () => {
    // The reset flow has none to offer, which is why this is separate from
    // validatePasswordChange rather than a parameter of it.
    expect(validateNewPassword(VALID, VALID)).not.toHaveProperty("current_password");
  });
});

describe("password reset routing", () => {
  it("does not gate the reset page on onboarding", () => {
    // A member who never finished first-run setup must still be able to
    // recover their account. Gating this would send them to fill in a form
    // they cannot reach, instead of letting them back in — a dead end with no
    // error message to explain itself.
    expect(requiresOnboarding("/reset-password")).toBe(false);
  });

  it("does not gate the request page or its confirmation either", () => {
    expect(requiresOnboarding("/forgot-password")).toBe(false);
    expect(requiresOnboarding("/reset-requested")).toBe(false);
  });

  it("announces a completed reset on the login screen", () => {
    expect(loginNotice("password-reset")?.tone).toBe("success");
  });

  it("builds the reset-specific error path", () => {
    expect(authErrorPath("reset-link-invalid")).toBe("/auth-error?reason=reset-link-invalid");
  });
});
