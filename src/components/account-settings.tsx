"use client";

import { useActionState, useEffect, useState } from "react";
import { Button, Field, SelectField, TextareaField } from "./ui";
import { useToast } from "./toast";
import {
  updateDisplayName,
  updateContactDetails,
  changePassword,
  type FormState,
} from "@/app/profile/actions";
import { PASSWORD_REQUIREMENTS_HINT } from "@/lib/password";
import { LOCATION_AREAS, LOCATION_LABELS } from "@/lib/listings";
import type { Roles } from "@/lib/contact-details";

/** Toasts a form action's outcome instead of an inline banner, once per submission. */
function useFormToast(state: FormState) {
  const { show } = useToast();
  useEffect(() => {
    if (state?.error) show(state.error, "error");
    else if (state?.success) show(state.success, "success");
    // Only re-fires when useActionState hands back a new result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}

/**
 * Exits edit mode the moment a submission succeeds.
 *
 * This only mirrors the action's own result, so it's adjusted during render
 * (comparing against the previous result) rather than in a `useEffect` —
 * the pattern React's docs recommend for state that derives from a value
 * that just changed, instead of a genuine side effect.
 */
function useExitEditingOnSuccess(state: FormState, setEditing: (editing: boolean) => void) {
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state?.success) setEditing(false);
  }
}

function DisplayNameForm({ current }: { current: string | null }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    updateDisplayName,
    undefined,
  );
  useFormToast(state);

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(current ?? "");
  useExitEditingOnSuccess(state, setEditing);

  return (
    <section>
      <h2 className="heading text-xl">Display name</h2>
      <p className="body-copy mt-2">Shown to people you rent with.</p>

      <form action={formAction} className="mt-5 max-w-sm space-y-4">
        <Field
          label="Display name"
          id="display_name"
          name="display_name"
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={!editing}
          autoComplete="name"
          maxLength={60}
          required
        />
        {editing ? (
          <Button key="save" type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save name"}
          </Button>
        ) : (
          <Button
            key="edit"
            type="button"
            variant="outline"
            onClick={(event) => {
              event.preventDefault();
              setEditing(true);
            }}
          >
            Edit name
          </Button>
        )}
      </form>
    </section>
  );
}

type ContactDetails = {
  contactNumber: string | null;
  preferredMeetupLocation: string | null;
  defaultPickupLocation: string | null;
  bio: string | null;
};

/** The location picker, identical but for its wording and which role needs it. */
function LocationSelect({
  id,
  label,
  value,
  onChange,
  disabled,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  error?: string;
}) {
  return (
    <SelectField
      label={label}
      id={id}
      name={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className="truncate"
      required
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

function ContactDetailsForm({
  contactNumber,
  preferredMeetupLocation,
  defaultPickupLocation,
  bio,
  roles,
}: ContactDetails & { roles: Roles }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    updateContactDetails,
    undefined,
  );
  useFormToast(state);

  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<ContactDetails>({
    contactNumber,
    preferredMeetupLocation,
    defaultPickupLocation,
    bio,
  });
  useExitEditingOnSuccess(state, setEditing);
  const errors = state?.fieldErrors ?? {};

  return (
    <section className="border-t border-line pt-10">
      <h2 className="heading text-xl">Contact details</h2>
      <p className="body-copy mt-2">Shared with a counterparty once a booking is confirmed.</p>

      <form action={formAction} className="mt-5 max-w-sm space-y-4">
        <Field
          label="Contact number"
          id="contact_number"
          name="contact_number"
          type="tel"
          value={values.contactNumber ?? ""}
          onChange={(event) => setValues((current) => ({ ...current, contactNumber: event.target.value }))}
          disabled={!editing}
          autoComplete="tel"
          required
          error={errors.contact_number}
        />
        {/* The action needs to know which locations are required, and a
            disabled input submits nothing — so the roles ride along as hidden
            fields rather than being re-derived server-side. */}
        <input type="hidden" name="wants_to_rent" value={roles.wantsToRent ? "on" : ""} />
        <input type="hidden" name="wants_to_own" value={roles.wantsToOwn ? "on" : ""} />

        {roles.wantsToRent && (
          <LocationSelect
            id="preferred_meetup_location"
            label="Preferred meetup location"
            value={values.preferredMeetupLocation ?? ""}
            onChange={(value) =>
              setValues((current) => ({ ...current, preferredMeetupLocation: value }))
            }
            disabled={!editing}
            error={errors.preferred_meetup_location}
          />
        )}

        {roles.wantsToOwn && (
          <LocationSelect
            id="default_pickup_location"
            label="Default pickup location"
            value={values.defaultPickupLocation ?? ""}
            onChange={(value) =>
              setValues((current) => ({ ...current, defaultPickupLocation: value }))
            }
            disabled={!editing}
            error={errors.default_pickup_location}
          />
        )}

        <TextareaField
          label="Bio"
          id="bio"
          name="bio"
          value={values.bio ?? ""}
          onChange={(event) => setValues((current) => ({ ...current, bio: event.target.value }))}
          disabled={!editing}
          rows={3}
          maxLength={500}
          hint="Optional. A line or two about you."
          error={errors.bio}
        />
        {editing ? (
          <Button key="save" type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save contact details"}
          </Button>
        ) : (
          <Button
            key="edit"
            type="button"
            variant="outline"
            onClick={(event) => {
              event.preventDefault();
              setEditing(true);
            }}
          >
            Edit contact details
          </Button>
        )}
      </form>
    </section>
  );
}

function PasswordForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    changePassword,
    undefined,
  );
  useFormToast(state);

  return (
    <section className="border-t border-line pt-10">
      <h2 className="heading text-xl">Password</h2>
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
          hint={PASSWORD_REQUIREMENTS_HINT}
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
        <Button type="submit" disabled={pending}>
          {pending ? "Changing…" : "Change password"}
        </Button>
      </form>
    </section>
  );
}

/** Account settings: the things a member changes about themselves. */
export function AccountSettings({
  displayName,
  roles,
  ...contact
}: { displayName: string | null; roles: Roles } & ContactDetails) {
  return (
    <div className="space-y-10">
      <DisplayNameForm current={displayName} />
      <ContactDetailsForm {...contact} roles={roles} />
      <PasswordForm />
    </div>
  );
}
