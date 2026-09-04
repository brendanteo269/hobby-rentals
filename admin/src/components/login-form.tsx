"use client";

import { useActionState } from "react";
import { Button, Field, FormMessage } from "./ui";
import { logIn, type AuthState } from "@/app/auth/actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(logIn, undefined);

  return (
    <div className="w-full max-w-md">
      <p className="eyebrow">HobbyRentals</p>
      <h1 className="display-caps mt-3 text-3xl">Admin sign in</h1>
      <p className="body-copy mt-3">
        Staff accounts only. Member accounts can sign in here but will not be able to see
        anything.
      </p>

      <form action={formAction} className="mt-8 space-y-5">
        <Field
          label="Email address"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
        <Field
          label="Password"
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        <FormMessage state={state} />
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
