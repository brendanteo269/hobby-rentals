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

/**
 * Where a reset link lands, once /auth/confirm has verified it.
 *
 * Deliberately absent from PROTECTED_PREFIXES: putting it behind the sign-in
 * wall would also put it behind the onboarding gate, and a member who never
 * finished first-run setup would be sent to fill in a form instead of being
 * allowed to recover their account. The page guards itself instead.
 */
export const RESET_PASSWORD_PATH = "/reset-password";
