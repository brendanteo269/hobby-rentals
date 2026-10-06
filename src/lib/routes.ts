/**
 * Auth route paths that more than one module needs to build.
 *
 * These carry query parameters the receiving page parses, so the path and the
 * parameter name are one decision, not two: `/login?reason=` is only useful if
 * the writer and `loginNotice` agree on the spelling. Building them here means
 * a typo is a type error rather than a notice that silently fails to render.
 *
 * Paths used in exactly one place stay inline — this is not a registry of every
 * route in the app.
 *
 * Each builder declares a template-literal return type rather than `string`.
 * `typedRoutes` checks hrefs against the generated route tree, and a widened
 * `string` fails that check at every call site — the literal type is what lets
 * these compose with redirect() and <Link>.
 */

import type { LoginNoticeReason } from "@/lib/session-policy";

/** The login screen, optionally explaining why the member has landed there. */
export function loginPath(
  reason?: LoginNoticeReason,
): "/login" | `/login?reason=${LoginNoticeReason}` {
  return reason ? `/login?reason=${reason}` : "/login";
}

/**
 * The "we have sent you a link" screen. The address is echoed back so the page
 * can show which inbox to check.
 */
export function checkEmailPath(
  email: string | undefined,
): "/check-email" | `/check-email?email=${string}` {
  return email ? `/check-email?email=${encodeURIComponent(email)}` : "/check-email";
}

/**
 * Why a confirmation link did not work.
 *
 * A closed set rather than the underlying error text, so nothing the member is
 * shown originates in the URL. See the `failure` helper in auth/confirm.
 */
export type AuthErrorCode = "link-invalid" | "link-missing" | "reset-link-invalid";

/** The screen shown when a confirmation link could not be used. */
export function authErrorPath(code: AuthErrorCode): `/auth-error?reason=${AuthErrorCode}` {
  return `/auth-error?reason=${code}`;
}

/**
 * The panels of the profile page, which are also the legal values of its
 * `?view=` parameter — hence living here rather than beside the tab markup.
 *
 * "renter" and "owner" are the two portal dashboards S1-02 sends a member to
 * once onboarding is done.
 */
export type ProfileView = "renter" | "owner" | "wallet" | "account";

const PROFILE_VIEWS: readonly ProfileView[] = ["renter", "owner", "wallet", "account"];

export function isProfileView(value: string | undefined): value is ProfileView {
  return PROFILE_VIEWS.includes(value as ProfileView);
}

/**
 * Which side of the marketplace to show a member by default.
 *
 * Someone who only owns lands on owning; everyone else — renters, and members
 * who do both — lands on renting. Used both to resolve an absent `?view=` and
 * to choose where onboarding sends them, so the two cannot disagree.
 */
export function defaultProfileView({
  wantsToRent,
  wantsToOwn,
}: {
  wantsToRent: boolean;
  wantsToOwn: boolean;
}): ProfileView {
  return wantsToOwn && !wantsToRent ? "owner" : "renter";
}

/** The profile page, optionally opened on a particular panel. */
export function profilePath(view?: ProfileView): "/profile" | `/profile?view=${ProfileView}` {
  return view ? `/profile?view=${view}` : "/profile";
}

/** First-run setup. */
export const ONBOARDING_PATH = "/onboarding";

/** Where a member asks for a reset link. */
export const FORGOT_PASSWORD_PATH = "/forgot-password";

/** The neutral "if that address has an account" confirmation. */
export const RESET_REQUESTED_PATH = "/reset-requested";

/** Where a listing's "Message owner" link opens the composer for a new enquiry thread. */
export function newListingConversationPath(listingId: string): `/messages/new?listing=${string}` {
  return `/messages/new?listing=${listingId}`;
}

/** Where a booking's "Message" link opens the composer for that booking's thread. */
export function newBookingConversationPath(bookingId: string): `/messages/new?booking=${string}` {
  return `/messages/new?booking=${bookingId}`;
}

/**
 * Where a reset link lands, once /auth/confirm has verified it.
 *
 * Deliberately absent from PROTECTED_PREFIXES: putting it behind the sign-in
 * wall would also put it behind the onboarding gate, and a member who never
 * finished first-run setup would be sent to fill in a form instead of being
 * allowed to recover their account. The page guards itself instead.
 */
export const RESET_PASSWORD_PATH = "/reset-password";

/** The full list of a member's notifications. */
export const NOTIFICATIONS_PATH = "/notifications";

/**
 * Where a notification's call to action lands, on the site and in email
 * alike. The page there decides whether to forward the member to the event
 * or explain that the window has closed.
 */
export function notificationPath(id: string): `/notifications/${string}` {
  return `/notifications/${encodeURIComponent(id)}`;
}

/** Where a member lands after signing in when nothing asked for elsewhere. */
export const DEFAULT_AFTER_LOGIN_PATH = "/profile";

/**
 * A post-sign-in destination taken from the URL, or null if it is not a path
 * on this site.
 *
 * `next` arrives in a query string anyone can write, so redirecting to it
 * unchecked is an open redirect: `?next=//evil.example` and
 * `?next=/\evil.example` are both read by browsers as another host. Only a
 * single leading slash followed by something other than a slash or backslash
 * is accepted, and control characters (which some browsers strip, turning a
 * safe-looking path into a host) are refused outright.
 */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  if (/[\u0000-\u001f\u007f]/.test(value)) return null;
  return value;
}
