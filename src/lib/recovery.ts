import "server-only";

import { cookies } from "next/headers";

/**
 * Proof that the current session came from a password-reset link — and which
 * account that link was for.
 *
 * Supabase turns a recovery link into an ordinary session, which on its own
 * would leave the reset screen reachable by anyone already signed in, letting
 * someone holding a stolen session set a new password without knowing the old
 * one. That is the hole the Account tab's change-password flow closes by
 * re-authenticating, and it must not be reopened round the side.
 *
 * The account id is the payload, not a bare flag. A flag answers "did *this
 * browser* open a reset link recently", which is the wrong question: open your
 * own reset link, sign in as somebody else in the same browser, and the flag
 * still says yes. Binding it means the mark is worthless against any session
 * but the one the link was issued for.
 *
 * httpOnly, so it cannot be forged from the console, and short-lived: it only
 * has to survive the hop from the email link to the form being submitted.
 */
const RECOVERY_COOKIE = "hr_recovery";

const RECOVERY_WINDOW_SECONDS = 15 * 60;

export async function markRecoverySession(userId: string): Promise<void> {
  (await cookies()).set(RECOVERY_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: RECOVERY_WINDOW_SECONDS,
  });
}

/**
 * Whether `userId` may set a password without proving the old one.
 *
 * Takes the id rather than returning the stored one so every caller has to
 * compare, instead of being able to check that *a* mark exists and forget
 * whose it is.
 */
export async function hasRecoveryMarkFor(userId: string): Promise<boolean> {
  const marked = (await cookies()).get(RECOVERY_COOKIE)?.value;
  return Boolean(marked) && marked === userId;
}

/**
 * Spends the mark.
 *
 * Called once the password has been changed, so a link cannot set a second
 * password inside the same window — and on sign-in and sign-out, so a mark
 * left behind by an abandoned reset cannot outlive the session it was issued
 * for on a shared machine.
 */
export async function clearRecoveryMark(): Promise<void> {
  (await cookies()).delete(RECOVERY_COOKIE);
}
