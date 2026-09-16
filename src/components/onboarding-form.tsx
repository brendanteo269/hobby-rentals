"use client";

import { useActionState } from "react";
import { Button, Field, FormError, SelectField, TextareaField } from "./ui";
import { completeOnboarding, type OnboardingState } from "@/app/profile/actions";
import { LOCATION_AREAS, LOCATION_LABELS } from "@/lib/listings";

const OPTIONS = [
  {
    name: "wants_to_rent",
    title: "I want to rent gear",
    body: "Borrow cameras, kayaks and kit from people nearby for a weekend or a week.",
  },
  {
    name: "wants_to_own",
    title: "I want to list my gear",
    body: "Earn from equipment that would otherwise sit in a cupboard between uses.",
  },
];

/**
 * First-run setup. Both options can be selected — most people arrive wanting
 * one side and discover the other, so neither is framed as the default.
 */
export function OnboardingForm() {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    completeOnboarding,
    undefined,
  );

  return (
    <div className="w-full max-w-lg">
      <p className="eyebrow">Welcome</p>
      <h1 className="heading mt-3 text-3xl">What brings you here?</h1>
      <p className="body-copy mt-3">
        Pick either, or both. This only shapes what you see first — you can change it whenever
        you like.
      </p>

      <form action={formAction} className="mt-8 space-y-4">
        {OPTIONS.map((option) => (
          <label
            key={option.name}
            className="flex cursor-pointer gap-4 rounded-2xl border border-line bg-white p-5 transition-colors hover:border-ink has-checked:border-ink has-checked:bg-surface-muted"
          >
            <input
              type="checkbox"
              name={option.name}
              className="mt-1 size-4 shrink-0 accent-ink"
            />
            <span>
              <span className="block text-sm font-semibold">{option.title}</span>
              <span className="body-copy mt-1 block">{option.body}</span>
            </span>
          </label>
        ))}

        <div className="space-y-4 border-t border-line pt-4">
          <Field
            label="Contact number"
            id="contact_number"
            name="contact_number"
            type="tel"
            autoComplete="tel"
            required
            hint="Shown to the other party once a booking is confirmed."
          />
          <SelectField
            label="Preferred meetup location"
            id="preferred_meetup_location"
            name="preferred_meetup_location"
            defaultValue=""
            required
            className="truncate"
            hint="Where you'd usually hand off gear."
          >
            <option value="" disabled>
              Choose one
            </option>
            {LOCATION_AREAS.map((value) => (
              <option key={value} value={value}>
                {LOCATION_LABELS[value]}
              </option>
            ))}
          </SelectField>
          <TextareaField
            label="Bio"
            id="bio"
            name="bio"
            rows={3}
            maxLength={500}
            hint="Optional. A line or two about you."
          />
        </div>

        <FormError message={state?.error} />

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Saving…" : "Continue"}
        </Button>
      </form>
    </div>
  );
}
