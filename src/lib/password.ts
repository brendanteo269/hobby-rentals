/**
 * Shared password complexity rule for signup and password changes.
 *
 * Length alone lets through "aaaaaaaa"; requiring one of each character
 * class is a cheap way to rule out the weakest passwords without a
 * dictionary check.
 */
export const PASSWORD_REQUIREMENTS_HINT =
  "At least 8 characters, with an uppercase letter, a lowercase letter and a number.";

export function validatePasswordComplexity(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-z]/.test(password)) return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must include a number.";
  return null;
}
