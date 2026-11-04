/**
 * The mobile number rules, shared by onboarding, the Account tab and the
 * server's onboarding check.
 *
 * Singapore mobiles only (+65, then eight digits starting 8 or 9): the
 * marketplace is Singapore-only, and refusing every other country is the main
 * defence against SMS pumping - bots requesting codes to premium-rate foreign
 * numbers, every one of which is a text we pay for.
 */

const LOCAL_MOBILE = /^[89]\d{7}$/;

/** Kept in step with [auth.sms] max_frequency in the server repo's config.toml. */
export const RESEND_WAIT_SECONDS = 60;

export const VERIFICATION_CODE_LENGTH = 6;

export const MOBILE_NUMBER_ERROR = "Enter a Singapore mobile number, e.g. 9123 4567.";

/**
 * The number in E.164 (+6591234567), or null when it is not a Singapore
 * mobile. Accepts it the ways people type it: "9123 4567", "+65 9123-4567",
 * "6591234567".
 */
export function normaliseSingaporeMobile(input: string): string | null {
  const compact = input.replace(/[\s\-().]/g, "");
  if (!/^\+?\d+$/.test(compact)) return null;
  // A + with any other country code is a foreign number, not a typo.
  if (compact.startsWith("+") && !compact.startsWith("+65")) return null;

  const digits = compact.replace(/^\+/, "");
  const local = digits.length === 10 && digits.startsWith("65") ? digits.slice(2) : digits;
  return LOCAL_MOBILE.test(local) ? `+65${local}` : null;
}

/** "+6591234567" as "+65 9123 4567". Anything else is returned unchanged. */
export function formatSingaporeMobile(number: string): string {
  const match = /^\+65(\d{4})(\d{4})$/.exec(number);
  return match ? `+65 ${match[1]} ${match[2]}` : number;
}

export function verificationCodeError(code: string): string | null {
  return new RegExp(`^\\d{${VERIFICATION_CODE_LENGTH}}$`).test(code)
    ? null
    : `Enter the ${VERIFICATION_CODE_LENGTH}-digit code we texted you.`;
}

/**
 * What to tell the member when Supabase Auth refuses to send or check a code.
 * Keyed on Auth's error codes rather than its messages, which are written for
 * developers and change between releases.
 */
export function mobileVerificationErrorMessage(error: { code?: string; message: string }): string {
  switch (error.code) {
    case "phone_exists":
      return "That number is already used by another account.";
    case "otp_expired":
      return "That code is wrong or has expired. Check it, or send a new one.";
    case "over_sms_send_rate_limit":
      // Auth's own wording here says how long to wait, which is the useful part.
      return error.message;
    case "sms_send_failed":
      return "We could not send a text to that number. Check it and try again.";
    case "over_request_rate_limit":
      return "Too many attempts. Please wait a few minutes and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}
