"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Field } from "./ui";
import type { AuthState } from "@/app/auth/actions";

type Props = {
  mode: "signup" | "login";
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
};

const COPY = {
  signup: {
    eyebrow: "Create your account",
    title: "Start renting your gear",
    blurb: "One account to rent from neighbours and list the kit you are not using.",
    submit: "Create account",
    footer: "Already have an account?",
    footerHref: "/login",
    footerLink: "Log in",
  },
  login: {
    eyebrow: "Welcome back",
    title: "Log in to HobbyRentals",
    blurb: "Pick up where you left off with your bookings and listings.",
    submit: "Log in",
    footer: "No account yet?",
    footerHref: "/signup",
    footerLink: "Sign up",
  },
} as const;

export function AuthForm({ mode, action }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const copy = COPY[mode];

  return (
    <div className="w-full max-w-md">
      <p className="eyebrow">{copy.eyebrow}</p>
      <h1 className="display-caps mt-3 text-3xl">{copy.title}</h1>
      <p className="body-copy mt-3">{copy.blurb}</p>

      <form action={formAction} className="mt-8 space-y-5">
        {mode === "signup" && (
          <Field
            label="Display name"
            id="display_name"
            name="display_name"
            type="text"
            autoComplete="name"
            hint="Optional. Shown to people you rent with."
          />
        )}

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
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
          minLength={8}
          hint={mode === "signup" ? "At least 8 characters." : undefined}
        />

        {state?.error && (
          <p role="alert" className="border-l-2 border-clay bg-sand px-3 py-2 text-sm text-ink">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Working…" : copy.submit}
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-soft">
        {copy.footer}{" "}
        <Link href={copy.footerHref} className="text-ink underline underline-offset-4">
          {copy.footerLink}
        </Link>
      </p>
    </div>
  );
}
