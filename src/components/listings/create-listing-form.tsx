"use client";

import { useActionState, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { Button, Field, FormError, SelectField, TextareaField } from "@/components/ui";
import { BlackoutRulesField } from "@/components/listings/blackout-rules-field";
import { WeeklyAvailabilityField } from "@/components/listings/weekly-availability-field";
import { RentalDurationField } from "@/components/listings/rental-duration-field";
import { PhotoUploadField } from "@/components/listings/photo-upload-field";
import { PricePerBlockField } from "@/components/listings/price-per-block-field";
import { submitListing, type CreateListingState } from "@/app/listings/actions";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CONDITIONS,
  CONDITION_LABELS,
  LOCATION_AREAS,
  LOCATION_LABELS,
} from "@/lib/listings";

/**
 * Everything read via plain `name`/`defaultValue` (as these all were until a
 * failed submission was found to wipe them). React resets a form's
 * *uncontrolled* fields once a form action finishes, success or failure —
 * the fix is to drive each of these from state instead. available_from/
 * available_until, min/max rental days, and photos each have their own
 * dedicated state already (below, or inside PricePerBlockField,
 * RentalDurationField, WeeklyAvailabilityField, BlackoutRulesField,
 * PhotoUploadField) and so don't belong here too.
 */
type FieldValues = {
  name: string;
  brand: string;
  description: string;
  category: string;
  condition: string;
  location_area: string;
  deposit: string;
};

const EMPTY_FIELDS: FieldValues = {
  name: "",
  brand: "",
  description: "",
  category: "",
  condition: "",
  location_area: "",
  deposit: "",
};

/**
 * The owner's create-listing form.
 *
 * Validation is the backend's: FastAPI returns one message per invalid field
 * and the action hands them back keyed by field name, which is what puts each
 * message under the control it belongs to. The browser's own `required` and
 * `min` attributes are kept as a first pass, so the common mistakes are caught
 * without a round trip, but nothing here is trusted to have caught them.
 */
export function CreateListingForm({ profileAvailableDays }: { profileAvailableDays: number[] }) {
  const [state, formAction, pending] = useActionState<CreateListingState, FormData>(
    submitListing,
    undefined,
  );
  const errors = state?.fieldErrors ?? {};

  // The three availability controls constrain one another: nothing may be
  // listed or blacked out before today, and the window's own end cannot
  // precede its start. Holding the two dates here is what lets the calendar
  // below offer only the days the listing is actually open for.
  const today = todayIso();
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableUntil, setAvailableUntil] = useState("");
  // A custom schedule starts from the owner's current default. This makes
  // switching modes predictable instead of silently reverting to Mon-Fri.
  const [customAvailability, setCustomAvailability] = useState(false);
  const [customDays, setCustomDays] = useState<number[]>(profileAvailableDays);
  const weeklyDays = customAvailability ? customDays : profileAvailableDays;

  const [fields, setFields] = useState<FieldValues>(EMPTY_FIELDS);
  const updateField =
    <K extends keyof FieldValues>(key: K) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setFields((current) => ({ ...current, [key]: event.target.value }));

  return (
    <form action={formAction} className="space-y-6">
      <FormSection title="The item">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Product name"
            id="name"
            name="name"
            maxLength={200}
            required
            error={errors.name}
            value={fields.name}
            onChange={updateField("name")}
          />
          <Field
            label="Brand"
            id="brand"
            name="brand"
            maxLength={200}
            required
            error={errors.brand}
            value={fields.brand}
            onChange={updateField("brand")}
          />
        </div>

        <TextareaField
          label="Description"
          id="description"
          name="description"
          rows={4}
          maxLength={5000}
          required
          hint="What is included, and anything a renter should know before collecting."
          error={errors.description}
          value={fields.description}
          onChange={updateField("description")}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            label="Category"
            id="category"
            name="category"
            required
            error={errors.category}
            value={fields.category}
            onChange={updateField("category")}
          >
            <option value="" disabled>
              Choose one
            </option>
            {CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {CATEGORY_LABELS[value]}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Condition"
            id="condition"
            name="condition"
            required
            error={errors.condition}
            value={fields.condition}
            onChange={updateField("condition")}
          >
            <option value="" disabled>
              Choose one
            </option>
            {CONDITIONS.map((value) => (
              <option key={value} value={value}>
                {CONDITION_LABELS[value]}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Collection area"
            id="location_area"
            name="location_area"
            required
            error={errors.location_area}
            value={fields.location_area}
            onChange={updateField("location_area")}
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
        </div>
      </FormSection>

      <FormSection title="Photos">
        <PhotoUploadField error={errors.photo_keys} />
      </FormSection>

      <FormSection title="Price">
        {/* Only one of the two is ever submitted, so at most one of these two
            backend error slots is ever populated - whichever it is applies to
            the one shared box. */}
        <PricePerBlockField error={errors.price_per_day_cents ?? errors.price_per_week_cents} />

        <Field
          label="Security deposit"
          id="deposit"
          name="deposit"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder="0.00"
          required
          hint="Held, not charged. Enter 0 for none."
          error={errors.deposit_cents}
          className="max-w-xs"
          value={fields.deposit}
          onChange={updateField("deposit")}
        />
      </FormSection>

      <FormSection title="Availability">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Available from"
            id="available_from"
            name="available_from"
            type="date"
            min={today}
            value={availableFrom}
            onChange={(event) => {
              const next = event.target.value;
              setAvailableFrom(next);
              // A window that now ends before it starts is not a state worth
              // keeping around for the owner to discover at submit time.
              if (availableUntil && next && availableUntil < next) setAvailableUntil("");
            }}
            required
            error={errors.available_from}
          />
          <Field
            label="Available until"
            id="available_until"
            name="available_until"
            type="date"
            min={availableFrom || today}
            value={availableUntil}
            onChange={(event) => setAvailableUntil(event.target.value)}
            hint="Optional. Leave blank to stay listed indefinitely."
            error={errors.available_until}
          />
        </div>

        <WeeklyAvailabilityField
          profileAvailableDays={profileAvailableDays}
          custom={customAvailability}
          onCustomChange={setCustomAvailability}
          days={customDays}
          onDaysChange={setCustomDays}
        />

        <RentalDurationField
          minError={errors.min_rental_days}
          maxError={errors.max_rental_days}
        />

        <BlackoutRulesField
          availableFrom={availableFrom}
          availableUntil={availableUntil}
          weeklyDays={weeklyDays}
          error={errors.blackout_dates}
        />
      </FormSection>

      <div className="border border-line bg-sand p-6 sm:p-8">
        <FormError message={state?.error} />
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Publishing…" : "Publish listing"}
        </Button>
        <p className="body-copy mt-4">
          Publishing puts this in the marketplace and in your rental inventory straight away.
        </p>
      </div>
    </form>
  );
}

/** Today as a local YYYY-MM-DD, which is what a date input's `min` expects. */
function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * One step of the form as its own surface, matching how a listing card gets
 * its own bordered white panel against the cream page — the same "distinct
 * things get distinct boxes" language, applied here to keep a long form
 * legible as a sequence of steps rather than one continuous scroll.
 */
function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border border-line bg-white">
      <div className="border-b border-line px-6 py-4 sm:px-8">
        <h2 className="display-caps text-lg">{title}</h2>
      </div>
      <div className="space-y-6 p-6 sm:p-8">{children}</div>
    </section>
  );
}
