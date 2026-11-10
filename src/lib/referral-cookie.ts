import "server-only";

import { cookies } from "next/headers";
import { REFERRAL_COOKIE, REFERRAL_COOKIE_MAX_AGE_SECONDS, normaliseReferralCode } from "@/lib/referrals";

/**
 * S6-07: the code from a referral link, kept until the visitor signs up.
 *
 * The link sends them on to /signup?ref=<code>, which is enough on its own.
 * The cookie is for the visitor who wanders off first - browses a listing,
 * comes back to sign up a day later from the header - and would otherwise
 * arrive at a blank form. httpOnly because nothing in the browser needs it:
 * the signup page reads it on the server and fills the field.
 */

export async function rememberReferralCode(code: string): Promise<void> {
  (await cookies()).set(REFERRAL_COOKIE, code, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
  });
}

/** The remembered code, or null when there is none or it is not a code. */
export async function rememberedReferralCode(): Promise<string | null> {
  return normaliseReferralCode((await cookies()).get(REFERRAL_COOKIE)?.value);
}

/** Called once an account exists: a referral is only ever recorded at signup. */
export async function forgetReferralCode(): Promise<void> {
  (await cookies()).delete(REFERRAL_COOKIE);
}
