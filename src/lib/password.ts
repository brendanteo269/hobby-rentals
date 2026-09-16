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

/**
 * The rules for choosing a new password, keyed by the box each one belongs
 * under.
 *
 * Shared by the reset flow, which has no current password to check, and by the
 * authenticated change below — so the two cannot drift on what counts as an
 * acceptable password or on where the message appears. Which field a message
 * sits beneath is the point of S1-03 AC3: "passwords do not match" under the
 * current-password box reads as an accusation rather than an instruction.
 */
export function validateNewPassword(next: string, confirm: string): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!next) errors.new_password = "Enter a new password.";
  if (!confirm) errors.confirm_password = "Repeat the new password.";

  // Complexity and the comparison only mean anything once there is something
  // in the box; lecturing about uppercase letters over an empty form is noise.
  if (!next) return errors;

  const complexityError = validatePasswordComplexity(next);
  if (complexityError) errors.new_password = complexityError;

  if (confirm && next !== confirm) {
    errors.confirm_password = "New passwords do not match.";
  }

  return errors;
}

/**
 * The rules for changing a password while signed in: the above, plus the two
 * that only exist when there is a current password to compare against.
 *
 * Whether the current password is *correct* is not decided here — only Supabase
 * can answer that — but the result belongs under the same `current_password`
 * key, which is why the caller adds it to this map rather than reporting it
 * separately.
 */
export function validatePasswordChange(
  current: string,
  next: string,
  confirm: string,
): Record<string, string> {
  const errors = validateNewPassword(next, confirm);

  if (!current) errors.current_password = "Enter your current password.";

  // Only when the new password is otherwise acceptable: being told it is the
  // same as the current one is unhelpful while it is also too short.
  if (current && next && !errors.new_password && next === current) {
    errors.new_password = "The new password is the same as the current one.";
  }

  return errors;
}
