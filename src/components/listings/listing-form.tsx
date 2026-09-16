"use client";

import { useActionState, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { Button, ButtonLink, Field, FormError, Modal, SelectField, TextareaField } from "@/components/ui";
import { BlackoutRulesField } from "@/components/listings/blackout-rules-field";
import { WeeklyAvailabilityField } from "@/components/listings/weekly-availability-field";
import { PickupLocationField } from "@/components/listings/pickup-location-field";
import { RentalDurationField } from "@/components/listings/rental-duration-field";
import { PhotoUploadField } from "@/components/listings/photo-upload-field";
import { PricePerBlockField } from "@/components/listings/price-per-block-field";
import type { ListingFormState } from "@/app/listings/actions";
import { centsToDollars, dollarsToCents, formatMoney } from "@/lib/format";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CONDITIONS,
  CONDITION_LABELS,
  type Listing,
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

function fieldsFrom(listing: Listing): FieldValues {
  return {
    name: listing.name,
    brand: listing.brand,
    description: listing.description,
    category: listing.category,
    condition: listing.condition,
    deposit: centsToDollars(listing.deposit_cents),
  };
}

/**
 * The stored price as the one-block field shows it. A listing may carry both
 * rates (the API allows it), but this form prices by exactly one block, so
 * the daily rate is shown when present and the weekly one otherwise.
 */
function priceFrom(listing: Listing): { block: "DAY" | "WEEK"; rate: string } {
  return listing.price_per_day_cents !== null
    ? { block: "DAY", rate: centsToDollars(listing.price_per_day_cents) }
    : { block: "WEEK", rate: centsToDollars(listing.price_per_week_cents ?? 0) };
}

/**
 * The owner's listing form, for creating a listing and for editing one.
 *
 * The two differ in where their values start, which action they submit to,
 * and one section: the weekly schedule and blackout dates are set here on
 * create but have their own page once the listing exists, so editing links
 * there instead of showing a second copy of those controls.
 *
 * Validation is the backend's: FastAPI returns one message per invalid field
 * and the action hands them back keyed by field name, which is what puts each
 * message under the control it belongs to. The browser's own `required` and
 * `min` attributes are kept as a first pass, so the common mistakes are caught
 * without a round trip, but nothing here is trusted to have caught them.
 */
export function ListingForm({
  action,
  listing,
  profileAvailableDays,
  profileDefaultLocation,
  depositCapBps,
}: {
  action: (prev: ListingFormState, formData: FormData) => Promise<ListingFormState>;
  /** Present when editing; every field then starts from this listing's stored values. */
  listing?: Listing;
  profileAvailableDays: number[];
  profileDefaultLocation: LocationArea | null;
  /** Basis points (10000 = 100%) a deposit may not exceed of the weekly-equivalent rate - drives the live recommendation under the deposit field. */
  depositCapBps: number;
}) {
  const editing = listing !== undefined;
  const [state, formAction, pending] = useActionState<ListingFormState, FormData>(action, undefined);
  const errors = state?.fieldErrors ?? {};

  // The three availability controls constrain one another: nothing may be
  // listed or blacked out before today, and the window's own end cannot
  // precede its start. Holding the two dates here is what lets the calendar
  // below offer only the days the listing is actually open for.
  const today = todayIso();
  const [availableFrom, setAvailableFrom] = useState(listing?.available_from ?? "");
  const [availableUntil, setAvailableUntil] = useState(listing?.available_until ?? "");
  // S1-10 Scenario 3: a window that has already opened is history. The API
  // rejects a change to it, so the input is disabled - and a disabled input is
  // not submitted, which is what keeps the unchanged value out of the request.
  const windowAlreadyOpen = editing && listing.available_from < today;

  // A custom schedule starts from the owner's current default. This makes
  // switching modes predictable instead of silently reverting to Mon-Fri.
  const [customAvailability, setCustomAvailability] = useState(false);
  const [customDays, setCustomDays] = useState<number[]>(profileAvailableDays);
  const weeklyDays = customAvailability ? customDays : profileAvailableDays;

  // Same "starts from the current default" reasoning as customDays above: a
  // custom pickup location should not open on a blank box. On edit, a stored
  // location that differs from the profile default *is* a custom one.
  const [customLocation, setCustomLocation] = useState(
    editing && listing.location_area !== profileDefaultLocation,
  );
  const [pickupLocation, setPickupLocation] = useState(
    listing?.location_area ?? profileDefaultLocation ?? "",
  );

  const [fields, setFields] = useState<FieldValues>(editing ? fieldsFrom(listing) : EMPTY_FIELDS);
  const updateField =
    <K extends keyof FieldValues>(key: K) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setFields((current) => ({ ...current, [key]: event.target.value }));

  // Mirrors PricePerBlockField's own internal state via its onRateChange
  // callback, purely so the deposit field below can show a live cap
  // recommendation - the price itself is still submitted by that field's own
  // named input, not from this copy.
  const initialPrice = editing ? priceFrom(listing) : null;
  const [priceBlock, setPriceBlock] = useState<"DAY" | "WEEK" | null>(initialPrice?.block ?? null);
  const [priceRate, setPriceRate] = useState(initialPrice?.rate ?? "");
  const depositHint = depositCapHint(depositCapBps, priceBlock, priceRate);

  // Each save produces a fresh state object, so remembering which one the
  // owner dismissed is enough to show the modal once per save and not again
  // on every re-render after it.
  const [dismissedNotice, setDismissedNotice] = useState<ListingFormState>(undefined);
  const saved = state?.success;
  const showSavedModal = saved !== undefined && state !== dismissedNotice;

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
        <PhotoUploadField
          error={errors.photo_keys}
          initialPhotos={listing?.photo_keys.map((key, index) => ({ key, url: listing.photo_urls[index] }))}
        />
      </FormSection>

      <FormSection title="Price">
        {/* Only one of the two is ever submitted, so at most one of these two
            backend error slots is ever populated - whichever it is applies to
            the one shared box. */}
        <PricePerBlockField
          error={errors.price_per_day_cents ?? errors.price_per_week_cents}
          initialBlock={initialPrice?.block}
          initialRate={initialPrice?.rate}
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
            required={!windowAlreadyOpen}
            disabled={windowAlreadyOpen}
            hint={windowAlreadyOpen ? "This listing has already opened, so its start date can no longer be changed." : undefined}
            error={errors.available_from}
          />
          <Field
            label="Available until"
            id="available_until"
            name="available_until"
            type="date"
            min={availableFrom > today ? availableFrom : today}
            value={availableUntil}
            onChange={(event) => setAvailableUntil(event.target.value)}
            hint="Optional. Leave blank to stay listed indefinitely."
            error={errors.available_until}
          />
        </div>

        {editing ? (
          <div className="rounded-lg border border-line bg-surface-muted p-4 text-sm">
            <p className="font-medium">Weekly schedule and blackout dates</p>
            <p className="body-copy mt-1">
              These have their own page, where changes are checked against confirmed bookings.
            </p>
            <ButtonLink
              variant="outline"
              href={`/listings/${listing.id}/availability`}
              className="mt-3 px-3 py-1.5 text-xs"
            >
              Manage availability
            </ButtonLink>
          </div>
        ) : (
          <WeeklyAvailabilityField
            profileAvailableDays={profileAvailableDays}
            custom={customAvailability}
            onCustomChange={setCustomAvailability}
            days={customDays}
            onDaysChange={setCustomDays}
          />
        )}

        <RentalDurationField
          minError={errors.min_rental_days}
          maxError={errors.max_rental_days}
          initialMin={listing?.min_rental_days ?? undefined}
          initialMax={editing ? listing.max_rental_days : undefined}
        />

        {!editing && (
          <BlackoutRulesField
            availableFrom={availableFrom}
            availableUntil={availableUntil}
            weeklyDays={weeklyDays}
            error={errors.blackout_dates}
          />
        )}
      </FormSection>

      <div className="rounded-2xl border border-line bg-surface-muted p-6 sm:p-8">
        <FormError message={state?.error} />
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {editing ? (pending ? "Saving…" : "Save changes") : pending ? "Publishing…" : "Publish listing"}
        </Button>
        <p className="body-copy mt-4">
          {editing
            ? "Changes apply to new bookings only. Anyone who has already booked keeps the terms they agreed to."
            : "Publishing puts this in the marketplace and in your rental inventory straight away."}
        </p>
      </div>

      {showSavedModal && (
        <Modal title="Changes saved" onClose={() => setDismissedNotice(state)}>
          <p className="body-copy mt-4">
            Changes saved successfully. 
          <br/>
            Note: Changes apply to new bookings only. Anyone who has
            already booked keeps the terms they agreed to.
          </p>
          <div className="mt-6 flex justify-end">
            <ButtonLink href="/listings/mine">Back to my listings</ButtonLink>
          </div>
        </Modal>
      )}
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
