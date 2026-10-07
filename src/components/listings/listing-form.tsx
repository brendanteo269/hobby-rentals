"use client";

import { useActionState, useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { Button, ButtonLink, Field, FormError, FormSection, Modal, SelectField, TextareaField } from "@/components/ui";
import { BlackoutRulesField } from "@/components/listings/blackout-rules-field";
import { WeeklyAvailabilityField } from "@/components/listings/weekly-availability-field";
import { PickupLocationField } from "@/components/listings/pickup-location-field";
import { RentalDurationField } from "@/components/listings/rental-duration-field";
import { PhotoUploadField } from "@/components/listings/photo-upload-field";
import { PricePerBlockField } from "@/components/listings/price-per-block-field";
import { PricingRecommendationPanel } from "@/components/listings/pricing-recommendation";
import { ReplacementValueField } from "@/components/listings/replacement-value-field";
import { HashTargetHighlight } from "@/components/hash-target-highlight";
import { BaselinePhotosField } from "@/components/passport/baseline-photos-field";
import { SerialField } from "@/components/passport/serial-form";
import type { ListingFormState } from "@/app/listings/actions";
import { centsToDollars, todayIso } from "@/lib/format";
import {
  CONDITIONS,
  CONDITION_LABELS,
  type BlackoutDate,
  type CategoryAttributeDefinition,
  type DateRange,
  type Listing,
  type LocationArea,
  type ListingCategoryOption,
} from "@/lib/listings";
import { getCategoryAttributes } from "@/lib/category-attributes";

type FieldValues = {
  name: string;
  brand: string;
  description: string;
  category: string;
  condition: string;
};

const EMPTY_FIELDS: FieldValues = {
  name: "",
  brand: "",
  description: "",
  category: "",
  condition: "",
};

function fieldsFrom(listing: Listing): FieldValues {
  return {
    name: listing.name,
    brand: listing.brand,
    description: listing.description,
    category: listing.category,
    condition: listing.condition,
  };
}

export function ListingForm({
  action,
  listing,
  availability,
  profileAvailableDays,
  profileDefaultLocation,
  depositCapBps,
  categories,
}: {
  action: (prev: ListingFormState, formData: FormData) => Promise<ListingFormState>;
  listing?: Listing;
  availability?: { blackouts: BlackoutDate[]; bookedRanges: DateRange[] };
  profileAvailableDays: number[];
  profileDefaultLocation: LocationArea | null;
  depositCapBps: number;
  categories: ListingCategoryOption[];
}) {
  const editing = listing !== undefined;
  const [state, formAction, pending] = useActionState<ListingFormState, FormData>(action, undefined);
  const errors = state?.fieldErrors ?? {};

  const today = todayIso();
  const [availableFrom, setAvailableFrom] = useState(listing?.available_from ?? "");
  const [availableUntil, setAvailableUntil] = useState(listing?.available_until ?? "");
  const windowAlreadyOpen = editing && listing.available_from < today;

  const [customAvailability, setCustomAvailability] = useState(listing?.has_custom_availability ?? false);
  const [customDays, setCustomDays] = useState<number[]>(
    listing?.custom_available_days ?? profileAvailableDays,
  );
  const weeklyDays = customAvailability ? customDays : profileAvailableDays;
  
  const calendarFrom = availableFrom && availableFrom < today ? today : availableFrom;

  const [customLocation, setCustomLocation] = useState(
    editing && listing.location_area !== profileDefaultLocation,
  );
  const [pickupLocation, setPickupLocation] = useState(
    listing?.location_area ?? profileDefaultLocation ?? "",
  );

  const [fields, setFields] = useState<FieldValues>(editing ? fieldsFrom(listing) : EMPTY_FIELDS);
  const [attributeDefinitions, setAttributeDefinitions] = useState<CategoryAttributeDefinition[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<string, string | number>>(() =>
    Object.fromEntries(Object.entries(listing?.attributes ?? {}).filter((entry): entry is [string, string | number] =>
      typeof entry[1] === "string" || typeof entry[1] === "number",
    )),
  );
  const [attributeLoadError, setAttributeLoadError] = useState<string | null>(null);

  // Pricing state for PricePerBlockField and PricingRecommendationPanel
  const initialPrice = listing
    ? listing.price_per_day_cents !== null
      ? { block: "DAY" as const, rate: (listing.price_per_day_cents / 100).toFixed(2) }
      : listing.price_per_week_cents !== null
      ? { block: "WEEK" as const, rate: (listing.price_per_week_cents / 100).toFixed(2) }
      : null
    : null;

  const [priceBlock, setPriceBlock] = useState<"DAY" | "WEEK" | null>(initialPrice?.block ?? "DAY");
  const [priceRate, setPriceRate] = useState<string>(initialPrice?.rate ?? "");
  // The server action always validates a deposit (0 is the supported way to
  // offer none), so the edit form must submit the stored value as well as the
  // rental rate. Without this control, every edit fails locally before its
  // changed fields can reach the API.
  const [deposit, setDeposit] = useState(listing ? centsToDollars(listing.deposit_cents) : "");

  useEffect(() => {
    let cancelled = false;
    if (!fields.category) {
      return;
    }
    getCategoryAttributes(fields.category)
      .then((definitions) => { if (!cancelled) setAttributeDefinitions(definitions); })
      .catch(() => { if (!cancelled) setAttributeLoadError("Category specifications could not be loaded. Please try again."); });
    return () => { cancelled = true; };
  }, [fields.category]);

  const updateField =
    <K extends keyof FieldValues>(key: K) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      if (key === "category") {
        setAttributeDefinitions([]);
        setAttributeValues({});
        setAttributeLoadError(null);
      }
      setFields((current) => ({ ...current, [key]: event.target.value }));
    };

  const [dismissedNotice, setDismissedNotice] = useState<ListingFormState>(undefined);
  const saved = state?.success;
  const showSavedModal = saved !== undefined && state !== dismissedNotice;
  const errorMessages = Object.values(errors);

  return (
    <form action={formAction} className="space-y-6">
      <HashTargetHighlight autoClearMs={8_000} />
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
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.label}
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

        {attributeDefinitions.length > 0 && (
          <div className="border-t border-line pt-5">
            <h3 className="text-sm font-medium">Category specifications</h3>
            <p className="body-copy mt-1">Add the details renters need to compare this item.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {attributeDefinitions.map((definition) => {
                const name = `attributes.${definition.attribute_key}`;
                const value = attributeValues[definition.attribute_key] ?? "";
                const setValue = (next: string) => setAttributeValues((current) => ({
                  ...current,
                  [definition.attribute_key]: definition.data_type === "number" && next !== "" ? Number(next) : next,
                }));
                return definition.data_type === "select" ? (
                  <SelectField key={definition.id} label={definition.label} id={name} required={definition.is_required} error={errors[name]} value={value} onChange={(event) => setValue(event.target.value)}>
                    <option value="">Choose one</option>
                    {definition.options.map((option) => <option key={option} value={option}>{option}</option>)}
                  </SelectField>
                ) : definition.data_type === "text" ? (
                  <TextareaField key={definition.id} label={definition.label} id={name} rows={3} required={definition.is_required} error={errors[name]} value={String(value)} onChange={(event) => setValue(event.target.value)} />
                ) : (
                  <Field key={definition.id} label={definition.label} id={name} type={definition.data_type === "number" ? "number" : "text"} min={definition.min_val ?? undefined} max={definition.max_val ?? undefined} step={definition.data_type === "number" ? "any" : undefined} required={definition.is_required} error={errors[name]} value={value} onChange={(event) => setValue(event.target.value)} />
                );
              })}
            </div>
            <input type="hidden" name="attributes" value={JSON.stringify(attributeValues)} />
          </div>
        )}
        {attributeLoadError && <p role="alert" className="text-sm text-accent-dark">{attributeLoadError}</p>}

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
        {editing ? (
          <PhotoUploadField
            error={errors.photo_keys}
            initialPhotos={listing.photo_keys.map((key, index) => ({ key, url: listing.photo_urls[index] }))}
          />
        ) : (
          <BaselinePhotosField error={errors.baseline_photos} />
        )}
      </FormSection>

      {!editing && (
        <FormSection title="Serial number">
          <SerialField error={errors.serial} />
        </FormSection>
      )}

      <FormSection title="Price" id="price">
        <PricePerBlockField
          error={errors.price_per_day_cents ?? errors.price_per_week_cents}
          initialBlock={initialPrice?.block}
          rate={priceRate}
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
          hint="Held as security during a rental, not charged. Enter 0 if no deposit is required."
          error={errors.deposit_cents}
          className="max-w-xs"
          value={deposit}
          onChange={(event) => setDeposit(event.target.value)}
        />
        <PricingRecommendationPanel
          key={`${fields.category}:${fields.brand}:${fields.condition}:${priceBlock ?? ""}:${JSON.stringify(attributeDefinitions.filter((definition) => definition.is_pricing_factor).map((definition) => [definition.attribute_key, attributeValues[definition.attribute_key] ?? null]))}`}
          category={fields.category}
          brand={fields.brand}
          condition={fields.condition}
          billingCycle={priceBlock}
          attributes={attributeValues}
          onApply={(rate) => {
            setPriceRate(rate);
          }}
        />

        <ReplacementValueField
          error={errors.replacement_value_cents}
          initialCents={listing?.replacement_value_cents}
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

        <WeeklyAvailabilityField
          profileAvailableDays={profileAvailableDays}
          custom={customAvailability}
          onCustomChange={setCustomAvailability}
          days={customDays}
          onDaysChange={setCustomDays}
          error={errors.custom_available_days}
        />

        <RentalDurationField
          minError={errors.min_rental_days}
          maxError={errors.max_rental_days}
          initialMin={listing?.min_rental_days ?? undefined}
          initialMax={editing ? listing.max_rental_days : undefined}
        />

        <BlackoutRulesField
          availableFrom={calendarFrom}
          availableUntil={availableUntil}
          weeklyDays={weeklyDays}
          initialRanges={availability?.blackouts}
          reservedRanges={availability?.bookedRanges}
          error={errors.blackout_dates}
        />
      </FormSection>

      <div className="rounded-2xl border border-line bg-surface-muted p-6 sm:p-8">
        <FormError message={state?.error} />
        {errorMessages.length > 0 && (
          <div role="alert" className="mb-4 border-l-2 border-accent bg-accent-soft px-4 py-3 text-sm text-accent-dark">
            <p className="font-medium">Please fix the following before saving:</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {errorMessages.map((message, index) => <li key={`${message}-${index}`}>{message}</li>)}
            </ul>
          </div>
        )}
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
          {saved.cancelledBookingCount > 0 && (
            <p className="body-copy mt-3">
              {saved.cancelledBookingCount === 1
                ? "One booking request was"
                : `${saved.cancelledBookingCount} booking requests were`}{" "}
              declined, because your new blackout dates cover the dates they asked for.
            </p>
          )}
          <div className="mt-6 flex justify-end">
            <ButtonLink href="/listings/mine">Back to my listings</ButtonLink>
          </div>
        </Modal>
      )}
    </form>
  );
}
