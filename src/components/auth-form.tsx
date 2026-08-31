"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "./ui";
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
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{copy.blurb}</p>

      <form action={formAction} className="mt-8 space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-2 w-full rounded-sm border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-ink"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            minLength={8}
            className="mt-2 w-full rounded-sm border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-ink"
          />
          {mode === "signup" && (
            <p className="mt-2 text-xs text-ink-soft">At least 8 characters.</p>
          )}
        </div>

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
