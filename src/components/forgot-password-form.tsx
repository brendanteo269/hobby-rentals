"use client";

import { useActionState, useState } from "react";
import { Button, Field } from "./ui";
import { requestPasswordReset, type ResetRequestState } from "@/app/auth/actions";
import { useSubmissionAttempt } from "./use-submission-attempt";

/**
 * Asks for the address to send a reset link to.
 *
 * Controlled and keyed for the same reason as every other form here: React 19
 * clears a form once its action returns, and being made to retype an address
 * because it was mistyped by one character is the sort of thing that makes
 * people give up on getting back into their account. See useSubmissionAttempt.
 */
export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<ResetRequestState, FormData>(
    requestPasswordReset,
    undefined,
  );

  const [email, setEmail] = useState("");
  const attempt = useSubmissionAttempt(state, (next) => {
    if (next?.email !== undefined) setEmail(next.email);
  });

  return (
    <form key={attempt} action={formAction} className="mt-8 space-y-5">
      <Field
        label="Email address"
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
        error={state?.error}
      />

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
