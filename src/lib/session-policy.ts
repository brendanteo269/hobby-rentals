/**
 * The inactivity policy, and the vocabulary for telling a member why their
 * session ended.
 *
 * Supabase expires the *access* token on its own schedule and silently
 * refreshes it for as long as the refresh token lives, which is what keeps a
 * member logged in across days. That is a token lifetime, not an idle timeout:
 * a tab left open overnight stays authenticated. The idle timeout here is the
 * application's own rule, layered on top, and it is enforced in middleware so
 * the check cannot be skipped by reaching a page from a different entry point.
 */

/**
 * Last-seen timestamp, in epoch milliseconds. httpOnly, so a member cannot
 * extend their own session by editing it from the console.
 */
export const ACTIVITY_COOKIE = "hr_last_seen";

const DEFAULT_IDLE_MINUTES = 30;

/**
 * How long a session may sit idle before it is ended.
 *
 * Overridable with SESSION_IDLE_MINUTES so the timeout can be shortened to
 * something testable (a minute or two) without a code change. A value that is
 * absent, unparseable or non-positive falls back to the default rather than
 * disabling the policy.
 */
export function idleTimeoutMs(): number {
  const configured = Number(process.env.SESSION_IDLE_MINUTES);
  const minutes =
    Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_IDLE_MINUTES;
  return minutes * 60 * 1000;
}

/**
 * Why a member is looking at the login page. Carried as `?reason=`.
 *
 * Not all of these are session *endings* any more: `verified` is how a member
 * arrives after confirming their email address, which is the one success case
 * among them.
 */
export type LoginNoticeReason = "expired" | "signed-out" | "verified";

type Notice = { message: string; tone: "error" | "success" };

const NOTICES: Record<LoginNoticeReason, Notice> = {
  expired: {
    message: "Your session expired after a period of inactivity. Please log in again.",
    tone: "error",
  },
  "signed-out": { message: "You have been logged out.", tone: "error" },
  verified: {
    message: "Your email address is confirmed. Log in to finish setting up your account.",
    tone: "success",
  },
};

/**
 * The notice for a `?reason=` value, or undefined if it is not one we set.
 *
 * Only known reasons resolve to copy: the query string is attacker-controlled,
 * so echoing it back onto the login screen would let a crafted link put
 * arbitrary text above the password field.
 *
 * `Object.hasOwn` rather than `in`, which walks the prototype chain and so
 * matches "constructor" and "toString" — handing back a function where the
 * caller expects a notice.
 */
export function loginNotice(reason: string | undefined): Notice | undefined {
  if (!reason || !Object.hasOwn(NOTICES, reason)) return undefined;
  return NOTICES[reason as LoginNoticeReason];
}
