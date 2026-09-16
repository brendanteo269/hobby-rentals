"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ACTIVITY_COOKIE } from "@/lib/session-policy";
import { validatePasswordComplexity, validateNewPassword } from "@/lib/password";
import { validateEmail } from "@/lib/email";
import { RESET_REQUESTED_PATH, authErrorPath, checkEmailPath, loginPath } from "@/lib/routes";
import { clearRecoveryMark, hasRecoveryMarkFor } from "@/lib/recovery";
import { exchangeEmailLink } from "@/lib/auth-callback";
import type { FieldErrors } from "@/lib/api/client";
import { clearLoginAttempts, lockoutMessage, recordFailedLogin } from "@/lib/login-attempts";

/**
 * What the member typed, echoed back so a rejected submission can redisplay
 * itself rather than being wiped by React 19's post-action form reset.
 *
 * The password is deliberately absent. Everything here crosses the wire twice
 * and sits in the rendered payload, which is not somewhere a password should
 * be put to save one field of retyping.
 */
export type AuthValues = { email: string; display_name: string; terms: boolean };

export type AuthState = { error?: string; values?: AuthValues } | undefined;

function readValues(formData: FormData): AuthValues {
  return {
    email: String(formData.get("email") ?? ""),
    display_name: String(formData.get("display_name") ?? ""),
    terms: formData.get("terms") === "on",
  };
}

/** Supabase's error code for a signup against a confirmed existing account. */
const DUPLICATE_EMAIL_CODE = "user_already_exists";

/**
 * Our wording for that case, rather than Supabase's "User already registered" —
 * it has to tell the member what to do next, not just what went wrong.
 */
const DUPLICATE_EMAIL_MESSAGE =
  "An account already exists for that email address. Log in instead, or reset your password.";

/** Supabase's error code for signing in to an account that is not yet verified. */
const UNCONFIRMED_EMAIL_CODE = "email_not_confirmed";

/**
 * Says what to do about it, unlike Supabase's bare "Email not confirmed".
 *
 * Signing up again with the same address resends the link — see signUp — which
 * is the route out of this if the first mail never arrived.
 */
const UNCONFIRMED_EMAIL_MESSAGE =
  "Confirm your email address before logging in. Check your inbox for the link we sent, " +
  "or sign up again with this address to have a new one sent.";

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  const values = readValues(formData);

  if (!email || !password) {
    return { error: "Email and password are both required.", values };
  }

  const emailError = validateEmail(email);
  if (emailError) return { error: emailError, values };

  const passwordError = validatePasswordComplexity(password);
  if (passwordError) return { error: passwordError, values };

  if (!values.terms) {
    return { error: "You must accept the Terms and Conditions to create an account.", values };
  }

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();

  // display_name rides along in user metadata; the on_auth_user_created
  // trigger copies it into public.profiles when the row is created.
  const displayName = String(formData.get("display_name") ?? "").trim();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
      data: displayName ? { display_name: displayName } : undefined,
    },
  });

  // S1-01 AC3: an address that already has an account must be rejected with an
  // error rather than a neutral message. That is a deliberate trade — telling a
  // stranger which addresses are registered is an account-enumeration oracle,
  // which is why Supabase obscures it by default. Do not quietly restore the
  // neutral behaviour without changing the AC first.
  //
  // Two different signals, because Supabase treats the two kinds of duplicate
  // differently (verified against gotrue v2.186):
  //
  //  - An address with a *confirmed* account returns a 422 error carrying the
  //    code below.
  //  - An address whose account exists but was never confirmed returns
  //    success, resends the confirmation mail, and — on some versions and
  //    configurations, though not this one — reports the duplicate by handing
  //    back a user with an empty `identities` array.
  if (error) {
    if (error.code === DUPLICATE_EMAIL_CODE) return { error: DUPLICATE_EMAIL_MESSAGE, values };
    return { error: error.message, values };
  }

  if (data.user && data.user.identities?.length === 0) {
    return { error: DUPLICATE_EMAIL_MESSAGE, values };
  }

  // An unconfirmed duplicate lands here, having had its confirmation link
  // resent. No second account is created and the next screen tells the truth,
  // so this is left as Supabase does it: the alternative is timing-based
  // guesswork about whether the row predates this request.
  redirect(checkEmailPath(email));
}

/**
 * Signs a member in, subject to the per-account attempt limit.
 *
 * The lockout is checked *before* the credentials are sent to Supabase, which
 * is what makes it a rate limit rather than a report: once an account is
 * locked, guesses stop costing anything to reject. A correct password is
 * refused too while the lock stands — an attacker who has just found the right
 * one must still wait out the window, which is most of the point.
 */
export async function logIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  const values = readValues(formData);
  if (!email || !password) {
    return { error: "Email and password are both required.", values };
  }

  const supabase = await createClient();

  const lockout = await lockoutMessage(supabase, email);
  if (lockout) return { error: lockout, values };

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // An unconfirmed address is not a failed credential, and counting it as one
    // locks a new member out of an account whose password they had right all
    // along — five attempts while waiting for an email, and the rate limiter
    // tells them they have guessed too many times. Verified against gotrue:
    // this is what a correct password for an unverified account returns.
    if (error.code === UNCONFIRMED_EMAIL_CODE) {
      return { error: UNCONFIRMED_EMAIL_MESSAGE, values };
    }

    await recordFailedLogin(supabase, email);
    return { error: error.message, values };
  }

  await clearLoginAttempts(supabase);
  // An abandoned reset must not leave a mark behind that outlives the session
  // it was issued for — on a shared machine the next person inherits it.
  await clearRecoveryMark();

  revalidatePath("/", "layout");
  redirect("/profile");
}

/**
 * Ends the session on the member's command.
 *
 * The default "global" scope is deliberate: logging out revokes every refresh
 * token issued to this account, so a token copied off this machine is dead
 * too. The access token already in hand stays technically valid until its own
 * short expiry — it cannot be recalled — but it can no longer be renewed, and
 * the cookies carrying it are gone.
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });

  (await cookies()).delete(ACTIVITY_COOKIE);
  await clearRecoveryMark();

  // Drops any cached render still holding the signed-in header.
  revalidatePath("/", "layout");
  redirect(loginPath("signed-out"));
}

/* Password reset (S1-17) ------------------------------------------------- */

export type ResetRequestState = { error?: string; email?: string } | undefined;

/**
 * Sends a reset link, and says the same thing either way.
 *
 * S1-17 AC2: the reply must not reveal whether an address has an account, so
 * every outcome lands on the same neutral screen. Supabase answers identically
 * for a registered and an unregistered address, so there is nothing to hide
 * here beyond not adding a disclosure of our own.
 *
 * Worth being honest in writing: this does *not* make the system
 * enumeration-safe. S1-01 AC3 requires signup to reject an address that
 * already has an account, which leaks exactly what this conceals. The
 * protection here is real but the pair still leaks, and closing it means
 * revisiting that acceptance criterion rather than this function.
 */
export async function requestPasswordReset(
  _prev: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) return { error: "Enter your email address.", email };

  // A malformed address is a format error, not a disclosure — it says nothing
  // about who does or does not have an account.
  const emailError = validateEmail(email);
  if (emailError) return { error: emailError, email };

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    // Its own callback route, not /auth/confirm — see that file for why the
    // route rather than a query parameter is what says a link is a reset.
    redirectTo: `${origin}/auth/recover`,
  });

  // Only the send rate limit can realistically land here, and saying so is not
  // a disclosure either. Anything else is logged rather than shown, so a
  // failure cannot become the signal AC2 exists to remove.
  if (error) {
    console.error("Password reset request failed:", error.message);
  }

  redirect(RESET_REQUESTED_PATH);
}

/** Shown when the mark is missing, gone, or belongs to a different account. */
const EXPIRED_RESET_MESSAGE =
  "That reset link is no longer valid. Request a new one to set your password.";

export type ResetPasswordState =
  | { error?: string; fieldErrors?: FieldErrors }
  | undefined;

/**
 * Sets a new password for whoever followed a reset link.
 *
 * The recovery mark is re-checked here and not only on the page: the page
 * guard decides what to render, this decides what to write, and a form can be
 * submitted without the page that drew it.
 */
export async function resetPassword(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  const fieldErrors = validateNewPassword(newPassword, confirmPassword);
  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Please correct the highlighted fields.", fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Both halves, together: a session, and a mark issued for *that* account.
  // Checking them separately would let a mark from one account authorise a
  // password change on another — see recovery.ts.
  if (!user || !(await hasRecoveryMarkFor(user.id))) {
    return { error: EXPIRED_RESET_MESSAGE };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };

  // S1-17 AC3: every existing session goes. Global scope is the point — a
  // member resetting their password may well be doing it because someone else
  // has one, and leaving that session alive would defeat the exercise. The
  // recovery token itself was already spent by verifyOtp, and Supabase keeps
  // only one per account, so there is no second token left to revoke.
  await supabase.auth.signOut({ scope: "global" });

  await clearRecoveryMark();
  (await cookies()).delete(ACTIVITY_COOKIE);

  redirect(loginPath("password-reset"));
}

/**
 * Verifies a signup confirmation link, from the POST the member's click makes
 * rather than from the GET that merely opened the page.
 *
 * The split is the entire point of the /auth/confirm page existing. A
 * confirmation token is single-use, and a link sitting in an inbox is fetched
 * by plenty of things that are not the member: Gmail's link safety scan,
 * Chrome's prefetcher, a university mail gateway rewriting URLs. Every one of
 * those issues a GET. A GET that verified would spend the token before the
 * member ever clicked, and they would be shown "that link has expired" for an
 * account which by then is already confirmed — observed in Chrome against a
 * personal Gmail address, not merely anticipated.
 *
 * None of those fetchers submit a form. Requiring a POST is what keeps the
 * token alive until a human asks for it.
 *
 * The token arrives in hidden fields, which the URL controls — exactly as it
 * did when this was a route handler reading the query string. That is safe for
 * the same reason it was then: resolveLinkType refuses any `type` the callback
 * does not serve, so a link still cannot talk its way into privileges the
 * route was not meant to grant.
 */
export async function confirmEmail(formData: FormData): Promise<void> {
  const params = new URLSearchParams();
  for (const key of ["token_hash", "type", "code"]) {
    const value = formData.get(key);
    if (typeof value === "string" && value) params.set(key, value);
  }

  const supabase = await createClient();
  const result = await exchangeEmailLink(supabase, params, ["signup", "email"]);

  if (!result.ok) {
    // Logged rather than reflected: an earlier version echoed this through the
    // query string and back onto the page, which let a crafted link put
    // arbitrary text on a HobbyRentals page.
    console.error("Email confirmation failed:", result.detail);
    redirect(authErrorPath("link-invalid"));
  }

  // Verifying established a session, and for a signup that session has to go:
  // S1-01 AC2 sends the member to the login screen, and arriving there already
  // logged in makes no sense. The link may well have been opened on a
  // different device from the one they will actually use.
  await supabase.auth.signOut();

  redirect(loginPath("verified"));
}
