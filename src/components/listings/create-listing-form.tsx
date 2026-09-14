"use client";

import { useActionState } from "react";
import { Button, Field, FormError, SelectField, TextareaField } from "@/components/ui";
import { BlackoutRulesField } from "@/components/listings/blackout-rules-field";
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
export function CreateListingForm() {
  const [state, formAction, pending] = useActionState<CreateListingState, FormData>(
    submitListing,
    undefined,
  );
  const errors = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-8">
      <section className="space-y-4">
        <h2 className="display-caps text-lg">The item</h2>

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
            hint="Where renters collect."
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
      </section>

      <section className="space-y-4 border-t border-line pt-8">
        <h2 className="display-caps text-lg">Price</h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Per day"
            id="price_per_day"
            name="price_per_day"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="25.00"
            required
            hint="SGD"
            error={errors.price_per_day_cents}
          />
          <Field
            label="Per week"
            id="price_per_week"
            name="price_per_week"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="120.00"
            hint="Optional."
            error={errors.price_per_week_cents}
          />
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
          />
        </div>
      </section>

      <section className="space-y-4 border-t border-line pt-8">
        <h2 className="display-caps text-lg">Availability</h2>

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
      </section>

      <div className="space-y-4 border-t border-line pt-8">
        <FormError message={state?.error} />
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Publishing…" : "Publish listing"}
        </Button>
        <p className="body-copy">
          Publishing puts this in the marketplace and in your rental inventory straight away.
        </p>
      </div>
    </form>
  );
}
