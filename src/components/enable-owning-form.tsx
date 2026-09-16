"use client";

import { useActionState, useState } from "react";
import { Button, FormError, SelectField } from "./ui";
import { LocationOptions } from "./location-options";
import { enableOwning, type FormState } from "@/app/profile/actions";

/**
 * "Start listing", asking the one question onboarding would have asked.
 *
 * This is the only other way to become an owner, so it has to collect what
 * onboarding collects — otherwise it produces the member onboarding refuses to
 * create, an owner with nowhere to hand gear over. Asking here rather than
 * afterwards is what makes the rule hold on both paths.
 */
export function EnableOwningForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    enableOwning,
    undefined,
  );

  // Controlled, so React 19 resetting the form after a rejected submission
  // does not also clear the answer the member just gave.
  const [location, setLocation] = useState("");
  const errors = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="mx-auto w-full max-w-xs space-y-4 text-left">
      <SelectField
        label="Default pickup location"
        id="default_pickup_location"
        name="default_pickup_location"
        value={location}
        onChange={(event) => setLocation(event.target.value)}
        required
        className="truncate"
        hint="Where renters would usually collect your gear."
        error={errors.default_pickup_location}
      >
        <LocationOptions />
      </SelectField>

      <FormError message={state?.error} />

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Start listing"}
      </Button>
    </form>
  );
}
