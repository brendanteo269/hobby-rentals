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

export type AuthState = { error?: string } | undefined;

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

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);

  if (!email || !password) return { error: "Email and password are both required." };

  const emailError = validateEmail(email);
  if (emailError) return { error: emailError };

  const passwordError = validatePasswordComplexity(password);
  if (passwordError) return { error: passwordError };

  if (formData.get("terms") !== "on") {
    return { error: "You must accept the Terms and Conditions to create an account." };
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
    if (error.code === DUPLICATE_EMAIL_CODE) return { error: DUPLICATE_EMAIL_MESSAGE };
    return { error: error.message };
  }

  if (data.user && data.user.identities?.length === 0) {
    return { error: DUPLICATE_EMAIL_MESSAGE };
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
  if (!email || !password) return { error: "Email and password are both required." };

  const supabase = await createClient();

  const lockout = await lockoutMessage(supabase, email);
  if (lockout) return { error: lockout };

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await recordFailedLogin(supabase, email);
    return { error: error.message };
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
