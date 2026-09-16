"use client";

import { useActionState, useEffect, useState } from "react";
import { Button, Field, FormError, SelectField, TextareaField } from "./ui";
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
import { useEditableSection } from "./use-editable-section";
import { useSubmissionAttempt } from "./use-submission-attempt";

/**
 * Announces a save that worked.
 *
 * Successes only. A failure has a field to sit under, and saying it twice —
 * once beside the control and again in a toast sliding over the page — is
 * noise rather than emphasis.
 */
function useSuccessToast(state: FormState) {
  const { show } = useToast();
  useEffect(() => {
    if (state?.success) show(state.success, "success");
    // Only re-fires when useActionState hands back a new result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}

/**
 * The whole-form message, shown only when it is not already under a field.
 *
 * "Please correct the highlighted fields" printed beneath the very fields it
 * points at says nothing; a database failure has nowhere else to go.
 */
function SectionError({
  state,
  errors,
}: {
  state: FormState;
  errors: Record<string, string>;
}) {
  if (!state?.error || Object.keys(errors).length > 0) return null;
  return <FormError message={state.error} />;
}

/** Save and Cancel while editing; a single Edit button when not. */
function EditControls({
  editing,
  pending,
  saveLabel,
  editLabel,
  onEdit,
  onCancel,
}: {
  editing: boolean;
  pending: boolean;
  saveLabel: string;
  editLabel: string;
  onEdit: () => void;
  onCancel: () => void;
}) {
  if (!editing) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={(event) => {
          event.preventDefault();
          onEdit();
        }}
      >
        {editLabel}
      </Button>
    );
  }

  return (
    <div className="flex gap-3">
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : saveLabel}
      </Button>
      {/* type="button", so abandoning an edit cannot accidentally submit it. */}
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={(event) => {
          event.preventDefault();
          onCancel();
        }}
      >
        Cancel
      </Button>
    </div>
  );
}

/**
 * The email address, shown but never editable.
 *
 * A confirmed address is the account's identity — it is what the verification
 * in S1-01 attaches to — so it is rendered as a disabled field rather than
 * omitted, answering "can I change this?" where the question is asked instead
 * of leaving the row conspicuously absent.
 */
function EmailRow({ email, verified }: { email: string; verified: boolean }) {
  return (
    <section>
      <h2 className="heading text-xl">Email address</h2>
      <p className="body-copy mt-2">Used to sign in, and never shown to other members.</p>

      <div className="mt-5 max-w-sm">
        <Field
          label="Email address"
          id="email"
          type="email"
          value={email}
          readOnly
          disabled
          hint={
            verified
              ? "Confirmed. This cannot be changed."
              : "Not yet confirmed. Open the link we sent you."
          }
        />
      </div>
    </section>
  );
}

type NameValues = { display_name: string };

function DisplayNameForm({ current }: { current: string | null }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    updateDisplayName,
    undefined,
  );
  useSuccessToast(state);

  const saved: NameValues = { display_name: current ?? "" };
  const { editing, values, attempt, setValue, edit, cancel } = useEditableSection(saved, state);
  const errors = state?.fieldErrors ?? {};

  return (
    <section className="border-t border-line pt-10">
      <h2 className="heading text-xl">Display name</h2>
      <p className="body-copy mt-2">Shown to people you rent with.</p>

      {/* key: see useSubmissionAttempt. */}
      <form key={attempt} action={formAction} className="mt-5 max-w-sm space-y-4">
        <Field
          label="Display name"
          id="display_name"
          name="display_name"
          type="text"
          value={values.display_name}
          onChange={(event) => setValue("display_name", event.target.value)}
          disabled={!editing}
          autoComplete="name"
          maxLength={60}
          required
          error={errors.display_name}
        />
        <SectionError state={state} errors={errors} />
        <EditControls
          editing={editing}
          pending={pending}
          saveLabel="Save name"
          editLabel="Edit name"
          onEdit={edit}
          onCancel={cancel}
        />
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

type ContactValues = {
  contact_number: string;
  preferred_meetup_location: string;
  default_pickup_location: string;
  bio: string;
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
  useSuccessToast(state);

  const saved: ContactValues = {
    contact_number: contactNumber ?? "",
    preferred_meetup_location: preferredMeetupLocation ?? "",
    default_pickup_location: defaultPickupLocation ?? "",
    bio: bio ?? "",
  };
  const { editing, values, attempt, setValue, edit, cancel } = useEditableSection(saved, state);
  const errors = state?.fieldErrors ?? {};

  return (
    <section className="border-t border-line pt-10">
      <h2 className="heading text-xl">Contact details</h2>
      <p className="body-copy mt-2">Shared with a counterparty once a booking is confirmed.</p>

      {/* key: see useSubmissionAttempt. */}
      <form key={attempt} action={formAction} className="mt-5 max-w-sm space-y-4">
        <Field
          label="Contact number"
          id="contact_number"
          name="contact_number"
          type="tel"
          value={values.contact_number}
          onChange={(event) => setValue("contact_number", event.target.value)}
          disabled={!editing}
          autoComplete="tel"
          required
          error={errors.contact_number}
        />

        {roles.wantsToRent && (
          <LocationSelect
            id="preferred_meetup_location"
            label="Preferred meetup location"
            value={values.preferred_meetup_location}
            onChange={(value) => setValue("preferred_meetup_location", value)}
            disabled={!editing}
            error={errors.preferred_meetup_location}
          />
        )}

        {roles.wantsToOwn && (
          <LocationSelect
            id="default_pickup_location"
            label="Default pickup location"
            value={values.default_pickup_location}
            onChange={(value) => setValue("default_pickup_location", value)}
            disabled={!editing}
            error={errors.default_pickup_location}
          />
        )}

        <TextareaField
          label="Bio"
          id="bio"
          name="bio"
          value={values.bio}
          onChange={(event) => setValue("bio", event.target.value)}
          disabled={!editing}
          rows={3}
          maxLength={500}
          hint="Optional. A line or two about you."
          error={errors.bio}
        />

        <SectionError state={state} errors={errors} />
        <EditControls
          editing={editing}
          pending={pending}
          saveLabel="Save contact details"
          editLabel="Edit contact details"
          onEdit={edit}
          onCancel={cancel}
        />
      </form>
    </section>
  );
}

function PasswordForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    changePassword,
    undefined,
  );
  useSuccessToast(state);

  // No edit mode: there is nothing saved to reveal, so the boxes are always
  // ready. They are controlled anyway, because a wrong current password must
  // not cost the member the new one they typed twice — and the key that
  // defeats React's form reset would otherwise guarantee exactly that. These
  // values are held here and never echoed back by the server, which is why
  // they can be kept at all, unlike the login form's password.
  const [values, setValues] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const set = (key: keyof typeof values, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  const attempt = useSubmissionAttempt(state, (next) => {
    // Nothing worth keeping once it has been changed — and leaving a password
    // sitting in a form nobody is using any more is worse than an empty box.
    if (next?.success) {
      setValues({ current_password: "", new_password: "", confirm_password: "" });
    }
  });
  const errors = state?.fieldErrors ?? {};

  return (
    <section className="border-t border-line pt-10">
      <h2 className="heading text-xl">Password</h2>
      <p className="body-copy mt-2">
        Your current password is required, so a stolen session cannot lock you out.
      </p>

      <form key={attempt} action={formAction} className="mt-5 max-w-sm space-y-4">
        <Field
          label="Current password"
          id="current_password"
          name="current_password"
          type="password"
          value={values.current_password}
          onChange={(event) => set("current_password", event.target.value)}
          autoComplete="current-password"
          required
          error={errors.current_password}
        />
        <Field
          label="New password"
          id="new_password"
          name="new_password"
          type="password"
          value={values.new_password}
          onChange={(event) => set("new_password", event.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
          hint={PASSWORD_REQUIREMENTS_HINT}
          error={errors.new_password}
        />
        <Field
          label="Confirm new password"
          id="confirm_password"
          name="confirm_password"
          type="password"
          value={values.confirm_password}
          onChange={(event) => set("confirm_password", event.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
          error={errors.confirm_password}
        />
        <SectionError state={state} errors={errors} />
        <Button type="submit" disabled={pending}>
          {pending ? "Changing…" : "Change password"}
        </Button>
      </form>
    </section>
  );
}

/** Account settings: the things a member changes about themselves. */
export function AccountSettings({
  email,
  emailVerified,
  displayName,
  roles,
  ...contact
}: {
  email: string;
  emailVerified: boolean;
  displayName: string | null;
  roles: Roles;
} & ContactDetails) {
  return (
    <div className="space-y-10">
      <EmailRow email={email} verified={emailVerified} />
      <DisplayNameForm current={displayName} />
      <ContactDetailsForm {...contact} roles={roles} />
      <PasswordForm />
    </div>
  );
}
