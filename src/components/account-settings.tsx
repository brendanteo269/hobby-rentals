"use client";

import { useActionState } from "react";
import { Button, Field } from "./ui";
import { updateDisplayName, changePassword, type FormState } from "@/app/profile/actions";

/** Renders the outcome of a settings form, success or failure. */
function FormMessage({ state }: { state: FormState }) {
  if (!state?.error && !state?.success) return null;
  const isError = Boolean(state.error);
  return (
    <p
      role={isError ? "alert" : "status"}
      className={`border-l-2 px-3 py-2 text-sm ${
        isError ? "border-clay bg-sand text-ink" : "border-ink bg-sand text-ink"
      }`}
    >
      {state.error ?? state.success}
    </p>
  );
}

function DisplayNameForm({ current }: { current: string | null }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    updateDisplayName,
    undefined,
  );

  return (
    <section>
      <h2 className="display-caps text-xl">Display name</h2>
      <p className="body-copy mt-2">Shown to people you rent with.</p>

      <form action={formAction} className="mt-5 max-w-sm space-y-4">
        <Field
          label="Display name"
          id="display_name"
          name="display_name"
          type="text"
          defaultValue={current ?? ""}
          autoComplete="name"
          maxLength={60}
          required
        />
        <FormMessage state={state} />
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save name"}
        </Button>
      </form>
    </section>
  );
}

function PasswordForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    changePassword,
    undefined,
  );

  return (
    <section className="border-t border-line pt-10">
      <h2 className="display-caps text-xl">Password</h2>
      <p className="body-copy mt-2">
        Your current password is required, so a stolen session cannot lock you out.
      </p>

      <form action={formAction} className="mt-5 max-w-sm space-y-4">
        <Field
          label="Current password"
          id="current_password"
          name="current_password"
          type="password"
          autoComplete="current-password"
          required
        />
        <Field
          label="New password"
          id="new_password"
          name="new_password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          hint="At least 8 characters."
        />
        <Field
          label="Confirm new password"
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <FormMessage state={state} />
        <Button type="submit" disabled={pending}>
          {pending ? "Changing…" : "Change password"}
        </Button>
      </form>
    </section>
  );
}

/** Account settings: the things a member changes about themselves. */
export function AccountSettings({ displayName }: { displayName: string | null }) {
  return (
    <div className="space-y-10">
      <DisplayNameForm current={displayName} />
      <PasswordForm />
    </div>
  );
}
