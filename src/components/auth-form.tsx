"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button, Field, FormError, FormNotice, type NoticeTone } from "./ui";
import type { AuthState, AuthValues } from "@/app/auth/actions";
import { PASSWORD_REQUIREMENTS_HINT } from "@/lib/password";
import { useSubmissionAttempt } from "./use-submission-attempt";

type Props = {
  mode: "signup" | "login";
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  /**
   * Why the member is here — "your session expired", "your email is
   * confirmed". Built by loginNotice, which allowlists the `?reason=` values
   * that resolve to copy.
   */
  notice?: { message: string; tone: NoticeTone };
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

const EMPTY: AuthValues = { email: "", display_name: "", terms: false };

export function AuthForm({ mode, action, notice }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const copy = COPY[mode];

  // A rejected submission must not cost the member their address and, on
  // signup, their name and their acceptance of the terms — see
  // useSubmissionAttempt. The password is not preserved, deliberately: it is
  // the one field worth retyping rather than sending back through the server.
  const [values, setValues] = useState<AuthValues>(EMPTY);
  const attempt = useSubmissionAttempt(state, (next) => {
    if (next?.values) setValues(next.values);
  });
  const set = <K extends keyof AuthValues>(key: K, value: AuthValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  return (
    <div className="w-full max-w-md">
      <p className="eyebrow">{copy.eyebrow}</p>
      <h1 className="heading mt-3 text-3xl">{copy.title}</h1>
      <p className="body-copy mt-3">{copy.blurb}</p>

      {notice && (
        <div className="mt-6">
          <FormNotice message={notice.message} tone={notice.tone} />
        </div>
      )}

      {/* key: see useSubmissionAttempt. */}
      <form key={attempt} action={formAction} className="mt-8 space-y-5">
        {mode === "signup" && (
          <Field
            label="Display name"
            id="display_name"
            name="display_name"
            type="text"
            autoComplete="name"
            value={values.display_name}
            onChange={(event) => set("display_name", event.target.value)}
            hint="Optional. Shown to people you rent with."
          />
        )}

        <Field
          label="Email address"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(event) => set("email", event.target.value)}
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
          hint={mode === "signup" ? PASSWORD_REQUIREMENTS_HINT : undefined}
        />

        {mode === "signup" && (
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="terms"
              checked={values.terms}
              onChange={(event) => set("terms", event.target.checked)}
              required
              className="mt-0.5 size-4 shrink-0 accent-ink"
            />
            <span className="body-copy">
              I agree to the{" "}
              <Link href="/" className="text-ink underline underline-offset-4">
                Terms and Conditions
              </Link>
              .
            </span>
          </label>
        )}

        <FormError message={state?.error} />

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
