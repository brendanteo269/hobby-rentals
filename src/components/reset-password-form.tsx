"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button, Field, FormError } from "./ui";
import { resetPassword, type ResetPasswordState } from "@/app/auth/actions";
import { PASSWORD_REQUIREMENTS_HINT } from "@/lib/password";
import { useSubmissionAttempt } from "./use-submission-attempt";
import { FORGOT_PASSWORD_PATH } from "@/lib/routes";

/**
 * Sets the new password.
 *
 * Controlled and keyed so a rejected attempt does not empty both boxes — see
 * useSubmissionAttempt. These values are held here and never echoed back by
 * the server, which is what makes keeping them reasonable.
 */
export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState<ResetPasswordState, FormData>(
    resetPassword,
    undefined,
  );

  const [values, setValues] = useState({ new_password: "", confirm_password: "" });
  const set = (key: keyof typeof values, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  const attempt = useSubmissionAttempt(state, () => {});
  const errors = state?.fieldErrors ?? {};

  return (
    <form key={attempt} action={formAction} className="mt-8 space-y-5">
      <Field
        label="New password"
        id="new_password"
        name="new_password"
        type="password"
        autoComplete="new-password"
        value={values.new_password}
        onChange={(event) => set("new_password", event.target.value)}
        minLength={8}
        required
        hint={PASSWORD_REQUIREMENTS_HINT}
        error={errors.new_password}
      />
      <Field
        label="Confirm new password"
        id="confirm_password"
        name="confirm_password"
        type="password"
        autoComplete="new-password"
        value={values.confirm_password}
        onChange={(event) => set("confirm_password", event.target.value)}
        minLength={8}
        required
        error={errors.confirm_password}
      />

      {/* Only when it is not already under a field — a lapsed mark has no
          field of its own. It also has no way forward from this page, so the
          message comes with one: the guard that catches the same condition on
          GET redirects to a screen that offers a new link, and being caught on
          POST instead should not leave the member stranded. */}
      {Object.keys(errors).length === 0 && state?.error && (
        <div className="space-y-2">
          <FormError message={state.error} />
          <p className="text-sm">
            <Link
              href={FORGOT_PASSWORD_PATH}
              className="text-ink underline underline-offset-4"
            >
              Request a new reset link
            </Link>
          </p>
        </div>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}
