"use client";

import { useActionState } from "react";
import { Button, Field, FormMessage } from "./ui";
import { enterPortal, type AuthState } from "@/app/auth/actions";

/** The portal's only gate: one shared password, no account. */
export function LoginForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    enterPortal,
    undefined,
  );

  return (
    <div className="w-full max-w-md">
      <p className="eyebrow">HobbyRentals</p>
      <h1 className="display-caps mt-3 text-3xl">Admin access</h1>
      <p className="body-copy mt-3">
        This portal is protected by a single shared password. Enter it to manage member
        accounts.
      </p>

      <form action={formAction} className="mt-8 space-y-5">
        <Field
          label="Admin password"
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
        />
        <FormMessage state={state} />
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Checking…" : "Enter"}
        </Button>
      </form>
    </div>
  );
}
