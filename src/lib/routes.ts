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
import type { InsightsPeriod } from "@/lib/owner-insights";
import type { RentalFilter } from "@/lib/rentals";
import type { SpendingPeriod } from "@/lib/spending";

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
 * Renting and owning are not panels: each lives in its own portal (My rentals,
 * My listings), so the profile is only about the member themselves.
 */
export type ProfileView = "ratings" | "wallet" | "account";

const PROFILE_VIEWS: readonly ProfileView[] = ["ratings", "wallet", "account"];

export function isProfileView(value: string | undefined): value is ProfileView {
  return PROFILE_VIEWS.includes(value as ProfileView);
}

/** The panel /profile opens on when no `?view=` names one. */
export const DEFAULT_PROFILE_VIEW: ProfileView = "ratings";

/** The profile page, optionally opened on a particular panel. */
export function profilePath(view?: ProfileView): "/profile" | `/profile?view=${ProfileView}` {
  return view ? `/profile?view=${view}` : "/profile";
}

/**
 * The renter portal's home, the overview of what needs doing. Also where a
 * member who has not switched renting on is offered to.
 */
export const RENTALS_PATH = "/rentals";

/** Immutable marketplace searches a renter has saved for discovery alerts. */
export const SAVED_SEARCHES_PATH = "/rentals/saved-searches";

/**
 * Every booking the renter has made, with its actions. Each row's id is what a
 * notification's "#booking-<id>" fragment scrolls to, so those links land here.
 */
export const RENTER_BOOKINGS_PATH = "/rentals/bookings";

/** The Bookings tab, optionally showing only one kind of booking. */
export function renterBookingsPath(
  filter?: RentalFilter,
): typeof RENTER_BOOKINGS_PATH | `${typeof RENTER_BOOKINGS_PATH}?show=${RentalFilter}` {
  return filter ? `${RENTER_BOOKINGS_PATH}?show=${filter}` : RENTER_BOOKINGS_PATH;
}

/** What renting has cost the member, from the wallet ledger, optionally over a particular period. */
export function renterSpendingPath(
  period?: SpendingPeriod,
): "/rentals/spending" | `/rentals/spending?period=${SpendingPeriod}` {
  return period ? `/rentals/spending?period=${period}` : "/rentals/spending";
}

/**
 * The owner portal's home, the inventory. Also where a member who has not
 * switched owning on is offered to.
 */
export const MY_LISTINGS_PATH = "/listings/mine";

/** The owner portal's insights tab, optionally over a particular period. */
export function ownerInsightsPath(
  period?: InsightsPeriod,
): "/listings/mine/insights" | `/listings/mine/insights?period=${InsightsPeriod}` {
  return period ? `/listings/mine/insights?period=${period}` : "/listings/mine/insights";
}

/**
 * Which portal to send a member to once onboarding is done.
 *
 * Someone who only owns lands on their listings; everyone else — renters, and
 * members who do both — lands on their rentals.
 */
export function defaultDashboardPath({
  wantsToRent,
  wantsToOwn,
}: {
  wantsToRent: boolean;
  wantsToOwn: boolean;
}): typeof RENTALS_PATH | typeof MY_LISTINGS_PATH {
  return wantsToOwn && !wantsToRent ? MY_LISTINGS_PATH : RENTALS_PATH;
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
