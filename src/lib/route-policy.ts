import type { EmailOtpType } from "@supabase/supabase-js";
/**
 * Which routes are gated on what, and which confirmation links end at the
 * login screen.
 *
 * Separate from the middleware that applies these and the route handler that
 * acts on them, because they are policy rather than mechanism — and because a
 * pure module can be tested without standing up a Supabase client or a request.
 */

import { ONBOARDING_PATH } from "@/lib/routes";

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
 * Routes requiring a signed-in member.
 *
 * /onboarding is included so first-run setup cannot be reached anonymously.
 * /browse and /listings read from the FastAPI backend, which rejects an
 * anonymous caller — guarding them here turns a redirect out of a
 * half-rendered page into a clean trip to the login screen.
 */
export const PROTECTED_PREFIXES = ["/profile", "/onboarding", "/browse", "/listings"];

export function requiresSignIn(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Whether `pathname` may only be reached once first-run setup is done.
 *
 * S1-02 AC5: onboarding cannot be bypassed. Everything behind the sign-in wall
 * qualifies *except* onboarding itself — gating that would leave the redirect
 * with nowhere to land, and the member looping between the two forever.
 */
export function requiresOnboarding(pathname: string): boolean {
  if (pathname.startsWith(ONBOARDING_PATH)) return false;
  return requiresSignIn(pathname);
}

/**
 * Which OTP type a callback route should act on, or null to refuse.
 *
 * The security-critical half of the email-link handling, pulled out so it can
 * be tested without a Supabase client. A callback route grants privileges on
 * the far side — the recovery route ends in the right to set a password
 * without knowing the old one — so a link must not be able to talk its way
 * into a route by naming a type that route does not serve. Treating the URL's
 * `type` as a hint, and falling back to the route's own when it disagreed, let
 * a signup token opened at the recovery route claim exactly that.
 *
 * An absent type resolves to the route's own only when the route serves
 * exactly one, so there is never a guess between two possibilities.
 */
export function resolveLinkType(
  claimed: string | null,
  allowed: readonly EmailOtpType[],
): EmailOtpType | null {
  const type = claimed ?? (allowed.length === 1 ? allowed[0] : null);
  if (!type) return null;
  return allowed.includes(type as EmailOtpType) ? (type as EmailOtpType) : null;
}
