"use client";

import { useActionState, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { Button, Field, FormError, SelectField, TextareaField } from "@/components/ui";
import { BlackoutRulesField } from "@/components/listings/blackout-rules-field";
import { WeeklyAvailabilityField } from "@/components/listings/weekly-availability-field";
import { PickupLocationField } from "@/components/listings/pickup-location-field";
import { RentalDurationField } from "@/components/listings/rental-duration-field";
import { PhotoUploadField } from "@/components/listings/photo-upload-field";
import { PricePerBlockField } from "@/components/listings/price-per-block-field";
import { submitListing, type CreateListingState } from "@/app/listings/actions";
import { dollarsToCents, formatMoney } from "@/lib/format";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CONDITIONS,
  CONDITION_LABELS,
  type LocationArea,
} from "@/lib/listings";

/**
 * Everything read via plain `name`/`defaultValue` (as these all were until a
 * failed submission was found to wipe them). React resets a form's
 * *uncontrolled* fields once a form action finishes, success or failure —
 * the fix is to drive each of these from state instead. available_from/
 * available_until, min/max rental days, photos, and the collection area each
 * have their own dedicated state already (below, or inside
 * PricePerBlockField, RentalDurationField, WeeklyAvailabilityField,
 * BlackoutRulesField, PhotoUploadField, PickupLocationField) and so don't
 * belong here too.
 */
type FieldValues = {
  name: string;
  brand: string;
  description: string;
  category: string;
  condition: string;
  deposit: string;
};

const EMPTY_FIELDS: FieldValues = {
  name: "",
  brand: "",
  description: "",
  category: "",
  condition: "",
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
export function CreateListingForm({
  profileAvailableDays,
  profileDefaultLocation,
  depositCapBps,
}: {
  profileAvailableDays: number[];
  profileDefaultLocation: LocationArea | null;
  /** Basis points (10000 = 100%) a deposit may not exceed of the weekly-equivalent rate - drives the live recommendation under the deposit field. */
  depositCapBps: number;
}) {
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

  // Same "starts from the current default" reasoning as customDays above: a
  // custom pickup location should not open on a blank box.
  const [customLocation, setCustomLocation] = useState(false);
  const [pickupLocation, setPickupLocation] = useState(profileDefaultLocation ?? "");

  const [fields, setFields] = useState<FieldValues>(EMPTY_FIELDS);
  const updateField =
    <K extends keyof FieldValues>(key: K) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setFields((current) => ({ ...current, [key]: event.target.value }));

  // Mirrors PricePerBlockField's own internal state via its onRateChange
  // callback, purely so the deposit field below can show a live cap
  // recommendation - the price itself is still submitted by that field's own
  // named input, not from this copy.
  const [priceBlock, setPriceBlock] = useState<"DAY" | "WEEK" | null>(null);
  const [priceRate, setPriceRate] = useState("");
  const depositHint = depositCapHint(depositCapBps, priceBlock, priceRate);

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

        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>

        <PickupLocationField
          profileDefault={profileDefaultLocation}
          custom={customLocation}
          onCustomChange={setCustomLocation}
          value={pickupLocation}
          onValueChange={setPickupLocation}
          error={errors.location_area}
        />
      </FormSection>

      <FormSection title="Photos">
        <PhotoUploadField error={errors.photo_keys} />
      </FormSection>

      <FormSection title="Price">
        {/* Only one of the two is ever submitted, so at most one of these two
            backend error slots is ever populated - whichever it is applies to
            the one shared box. */}
        <PricePerBlockField
          error={errors.price_per_day_cents ?? errors.price_per_week_cents}
          onRateChange={(block, rate) => {
            setPriceBlock(block);
            setPriceRate(rate);
          }}
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
          hint={depositHint}
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

      <div className="rounded-2xl border border-line bg-surface-muted p-6 sm:p-8">
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
 * The deposit field's hint text: the static explanation always, plus a live
 * "recommended up to $X" once a rate is entered.
 *
 * Mirrors CreateListingRequest._deposit_within_cap's formula exactly (a
 * week rate used directly, or a day rate x7) so the number shown here is
 * never a value the backend would then reject - a proactive echo of that
 * rule, not a second one that could drift from it.
 */
function depositCapHint(depositCapBps: number, block: "DAY" | "WEEK" | null, rate: string): string {
  const base = "Held, not charged. Enter 0 for none.";
  const rateCents = dollarsToCents(rate);
  if (block === null || rateCents === null || Number.isNaN(rateCents) || rateCents <= 0) {
    return base;
  }
  const weeklyEquivalentCents = block === "WEEK" ? rateCents : rateCents * 7;
  const capCents = Math.floor((weeklyEquivalentCents * depositCapBps) / 10_000);
  return `${base} Recommended: up to ${formatMoney(capCents)} (${depositCapBps / 100}% of the weekly rate).`;
}

/**
 * One step of the form as its own surface, matching how a listing card gets
 * its own bordered white panel against the page — the same "distinct
 * things get distinct boxes" language, applied here to keep a long form
 * legible as a sequence of steps rather than one continuous scroll.
 */
function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden card">
      <div className="border-b border-line px-6 py-4 sm:px-8">
        <h2 className="heading text-lg">{title}</h2>
      </div>
      <div className="space-y-6 p-6 sm:p-8">{children}</div>
    </section>
  );
}
