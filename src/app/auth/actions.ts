"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ACTIVITY_COOKIE } from "@/lib/session-policy";
import { validatePasswordComplexity } from "@/lib/password";
import { validateEmail } from "@/lib/email";
import { checkEmailPath, loginPath } from "@/lib/routes";
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
 *
 * Deliberately does not mention resetting a password: there is no reset flow
 * yet (S1-17), and pointing at a door that is not there is worse than saying
 * less. Add it here when that story lands.
 */
const DUPLICATE_EMAIL_MESSAGE =
  "An account already exists for that email address. Log in instead.";

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

  // Drops any cached render still holding the signed-in header.
  revalidatePath("/", "layout");
  redirect(loginPath("signed-out"));
}
