/**
 * Which routes require a confirmed email address, and which confirmation links
 * end at the login screen (S1-01).
 *
 * Separate from the middleware that applies it and the route handler that acts
 * on it, because both are policy rather than mechanism — and because a pure
 * module can be tested without standing up a Supabase client or a request.
 */

import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Routes a member may not reach until their email address is confirmed.
 *
 * S1-01 restricts lending and booking *actions*, not browsing, so `/browse`
 * and a listing's detail page stay open — an unverified member can look
 * around, they just cannot transact.
 */
const VERIFIED_ONLY_PREFIXES = ["/listings/new"];

/** Suffixes under /listings/<id>/ that are owner actions rather than reads. */
const VERIFIED_ONLY_LISTING_ACTIONS = ["/availability"];

/**
 * Whether `pathname` is a lending or booking action.
 *
 * Enforced in middleware as well as by Supabase's own `enable_confirmations`,
 * because that is a project setting which can be switched off in a dashboard
 * with nothing in the repository to notice.
 */
export function requiresVerifiedEmail(pathname: string): boolean {
  if (VERIFIED_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  return (
    pathname.startsWith("/listings/") &&
    VERIFIED_ONLY_LISTING_ACTIONS.some((action) => pathname.endsWith(action))
  );
}

/**
 * Confirmation types after which the member is signed out and sent to login.
 *
 * S1-01 AC2 asks for exactly that, and verifying an address is not the same
 * event as choosing to sign in — the link may well be opened on a different
 * device from the one that will be used.
 */
const SIGN_OUT_AFTER: ReadonlySet<string> = new Set<EmailOtpType>(["signup", "email"]);

/**
 * Whether a confirmation of this type should end at the login screen.
 *
 * A `code` link carries no `type`, and the only code links this app sends are
 * signup confirmations, so an absent type is treated as one.
 *
 * Password recovery is deliberately excluded: that flow has to keep the
 * session it just established in order to reach the set-a-new-password screen.
 */
export function returnsToLogin(type: EmailOtpType | null): boolean {
  return type === null || SIGN_OUT_AFTER.has(type);
}
