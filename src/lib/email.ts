/**
 * Email address validation for signup.
 *
 * Shaped like validatePasswordComplexity in ./password so the two read alike
 * at the call site: null means valid, a string is the message to show.
 *
 * The pattern is deliberately loose. RFC 5322 permits addresses almost nobody
 * expects to be legal, and a strict regex is far more likely to reject a real
 * address than to catch a fake one — the only address that is truly proven is
 * one that received the confirmation link. This rules out the typos worth
 * catching before a round trip: a missing @, a missing domain, whitespace.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/** Longer than the longest address any mail server will accept. */
const MAX_EMAIL_LENGTH = 254;

export function validateEmail(email: string): string | null {
  if (!EMAIL_PATTERN.test(email)) return "Enter a valid email address.";
  if (email.length > MAX_EMAIL_LENGTH) return "That email address is too long.";
  return null;
}
