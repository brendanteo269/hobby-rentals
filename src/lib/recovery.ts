import "server-only";

import { cookies } from "next/headers";

/**
 * Proof that the current session came from a password-reset link.
 *
 * Supabase turns a recovery link into an ordinary session, which on its own
 * would leave the reset screen reachable by *anyone* already signed in —
 * letting someone holding a stolen session set a new password without knowing
 * the old one. That is exactly the hole the Account tab's change-password flow
 * closes by re-authenticating, and it must not be reopened round the side.
 *
 * So the confirm route marks the session as having arrived by link, and the
 * reset screen refuses to serve anyone without the mark.
 *
 * httpOnly, so it cannot be forged from the console, and short-lived: it only
 * has to survive the hop from the email link to the form being submitted.
 */
const RECOVERY_COOKIE = "hr_recovery";

const RECOVERY_WINDOW_SECONDS = 15 * 60;

export async function markRecoverySession(): Promise<void> {
  (await cookies()).set(RECOVERY_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: RECOVERY_WINDOW_SECONDS,
  });
}

/** Whether this request may set a password without proving the old one. */
export async function hasRecoveryMark(): Promise<boolean> {
  return (await cookies()).has(RECOVERY_COOKIE);
}

/**
 * Spends the mark.
 *
 * Called once the password has actually been changed, so a link cannot be
 * reused to set a second password inside the same window.
 */
export async function clearRecoveryMark(): Promise<void> {
  (await cookies()).delete(RECOVERY_COOKIE);
}
