"use client";

import { useActionState } from "react";
import type { ReactNode } from "react";
import { Button, Field, FormError, SelectField, TextareaField } from "@/components/ui";
import { BlackoutRulesField } from "@/components/listings/blackout-rules-field";
import { WeeklyAvailabilityField } from "@/components/listings/weekly-availability-field";
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
          />
          <Field
            label="Brand"
            id="brand"
            name="brand"
            maxLength={200}
            required
            error={errors.brand}
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
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            label="Category"
            id="category"
            name="category"
            defaultValue=""
            required
            error={errors.category}
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
            defaultValue=""
            required
            error={errors.condition}
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
            defaultValue=""
            required
            error={errors.location_area}
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
        />
      </FormSection>

      <FormSection title="Availability">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Available from"
            id="available_from"
            name="available_from"
            type="date"
            required
            error={errors.available_from}
          />
          <Field
            label="Available until"
            id="available_until"
            name="available_until"
            type="date"
            hint="Optional. Leave blank to stay listed indefinitely."
            error={errors.available_until}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Minimum rental days"
            id="min_rental_days"
            name="min_rental_days"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            hint="Optional."
            error={errors.min_rental_days}
          />
          <Field
            label="Maximum rental days"
            id="max_rental_days"
            name="max_rental_days"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            hint="Optional."
            error={errors.max_rental_days}
          />
        </div>

        <BlackoutRulesField error={errors.blackout_dates} />
        <WeeklyAvailabilityField profileAvailableDays={profileAvailableDays} />
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
