import { cookies } from "next/headers";
import { portalPassword } from "@/lib/env";

/**
 * The portal's front door: one shared password for the whole admin site,
 * rather than a Supabase account per administrator.
 *
 * What this trades away, stated plainly because the code cannot say it:
 * a shared credential identifies nobody, so the audit trail records that an
 * action was taken through the portal but not by whom; it cannot be revoked
 * for one person; and it does not expire. It is a proof-of-concept gate, and
 * the pieces it replaced — per-user roles, and the is_admin() path still
 * present in the database — are intact underneath it.
 *
 * Everything here runs on the server. The password is never sent to the
 * browser, and the cookie holds a digest rather than the password itself, so
 * reading the cookie off a machine does not hand over the credential.
 */

const COOKIE_NAME = "admin_portal_session";

/** Eight hours: long enough for a working day, short enough to not linger. */
const MAX_AGE_SECONDS = 60 * 60 * 8;

/**
 * The cookie value proving the password was entered.
 *
 * A digest of the password under a fixed label, so the cookie cannot be
 * guessed without knowing the password, and changing the password
 * invalidates every session that was issued under the old one.
 *
 * Web Crypto rather than node:crypto because this runs in the proxy too,
 * which is not a Node runtime.
 */
async function sessionToken(): Promise<string> {
  const material = new TextEncoder().encode(`hobbyrentals-admin-portal:${portalPassword()}`);
  const digest = await crypto.subtle.digest("SHA-256", material);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Compares without leaking, through timing, how much of a value matched.
 *
 * Length is compared first and separately: the loop below cannot run over two
 * different lengths, and the length of a digest is not a secret.
 */
function equalsInConstantTime(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let difference = 0;
  for (let i = 0; i < a.length; i++) {
    difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return difference === 0;
}

/** Whether a cookie value is a currently valid portal session. */
export async function isValidSessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  return equalsInConstantTime(token, await sessionToken());
}

/** Whether the request carries a valid portal session. */
export async function hasPortalSession(): Promise<boolean> {
  const store = await cookies();
  return isValidSessionToken(store.get(COOKIE_NAME)?.value);
}

/** Checks a submitted password against the configured one. */
export async function isCorrectPassword(submitted: string): Promise<boolean> {
  return equalsInConstantTime(submitted, portalPassword());
}

/** Issues the session cookie. Call only after isCorrectPassword() has passed. */
export async function startPortalSession(): Promise<void> {
  const store = await cookies();

  store.set(COOKIE_NAME, await sessionToken(), {
    // Unreadable to JavaScript, so a script injected into a page cannot
    // exfiltrate the session.
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endPortalSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Read by the proxy, which has a request rather than the cookies() store. */
export const PORTAL_COOKIE_NAME = COOKIE_NAME;
