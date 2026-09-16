"use client";

import { useActionState, useState } from "react";
import { Button, Field, FormError, SelectField, TextareaField } from "./ui";
import {
  completeOnboarding,
  type OnboardingState,
  type OnboardingValues,
} from "@/app/profile/actions";
import { LOCATION_AREAS, LOCATION_LABELS } from "@/lib/listings";
import { useSubmissionAttempt } from "./use-submission-attempt";

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
] as const;

function emptyValues(displayName?: string | null): OnboardingValues {
  return {
    display_name: displayName ?? "",
    contact_number: "",
    preferred_meetup_location: "",
    default_pickup_location: "",
    bio: "",
    wants_to_rent: false,
    wants_to_own: false,
  };
}

/** The location picker, which differs only in wording between the two roles. */
function LocationField({
  id,
  label,
  hint,
  error,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <SelectField
      label={label}
      id={id}
      name={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required
      className="truncate"
      hint={hint}
      error={error}
    >
      <option value="" disabled>
        Choose one
      </option>
      {LOCATION_AREAS.map((area) => (
        <option key={area} value={area}>
          {LOCATION_LABELS[area]}
        </option>
      ))}
    </SelectField>
  );
}

/**
 * First-run setup.
 *
 * Both roles can be selected — most people arrive wanting one side and
 * discover the other, so neither is framed as the default. The location
 * questions differ by role and are revealed as each is picked: asking a renter
 * where they hand gear over is a question they cannot answer, and showing both
 * to everyone makes the form look twice as long as it is.
 *
 * Every control is deliberately *controlled*, and the form is keyed on the
 * submission attempt, so a rejected submission does not wipe what the member
 * typed — see useSubmissionAttempt for why both halves are needed.
 */
export function OnboardingForm({ defaultDisplayName }: { defaultDisplayName?: string | null }) {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    completeOnboarding,
    undefined,
  );

  const [values, setValues] = useState<OnboardingValues>(() => emptyValues(defaultDisplayName));

  // Re-seed from the rejected submission the moment a new result arrives.
  const attempt = useSubmissionAttempt(state, (next) => {
    if (next?.values) setValues(next.values);
  });

  const errors = state?.fieldErrors ?? {};
  const set = <K extends keyof OnboardingValues>(key: K, value: OnboardingValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  return (
    <div className="w-full max-w-lg">
      <p className="eyebrow">Welcome</p>
      <h1 className="heading mt-3 text-3xl">What brings you here?</h1>
      <p className="body-copy mt-3">
        Pick either, or both. This only shapes what you see first — you can change it whenever
        you like.
      </p>

      {/* key: see useSubmissionAttempt. */}
      <form key={attempt} action={formAction} className="mt-8 space-y-4">
        {OPTIONS.map((option) => (
          <label
            key={option.name}
            className="flex cursor-pointer gap-4 rounded-2xl border border-line bg-white p-5 transition-colors hover:border-ink has-checked:border-ink has-checked:bg-surface-muted"
          >
            <input
              type="checkbox"
              name={option.name}
              checked={values[option.name]}
              onChange={(event) => set(option.name, event.target.checked)}
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
            label="Display name"
            id="display_name"
            name="display_name"
            type="text"
            autoComplete="name"
            value={values.display_name}
            onChange={(event) => set("display_name", event.target.value)}
            required
            maxLength={60}
            hint="Shown to people you rent with."
            error={errors.display_name}
          />
          <Field
            label="Contact number"
            id="contact_number"
            name="contact_number"
            type="tel"
            autoComplete="tel"
            value={values.contact_number}
            onChange={(event) => set("contact_number", event.target.value)}
            required
            hint="Shown to the other party once a booking is confirmed."
            error={errors.contact_number}
          />

          {values.wants_to_rent && (
            <LocationField
              id="preferred_meetup_location"
              label="Preferred meetup location"
              value={values.preferred_meetup_location}
              onChange={(value) => set("preferred_meetup_location", value)}
              hint="Where you'd usually collect gear you have rented."
              error={errors.preferred_meetup_location}
            />
          )}

          {values.wants_to_own && (
            <LocationField
              id="default_pickup_location"
              label="Default pickup location"
              value={values.default_pickup_location}
              onChange={(value) => set("default_pickup_location", value)}
              hint="Where renters would usually collect your gear."
              error={errors.default_pickup_location}
            />
          )}

          <TextareaField
            label="Bio"
            id="bio"
            name="bio"
            value={values.bio}
            onChange={(event) => set("bio", event.target.value)}
            rows={3}
            maxLength={500}
            hint="Optional. A line or two about you."
            error={errors.bio}
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
