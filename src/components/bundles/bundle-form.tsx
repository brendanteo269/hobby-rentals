"use client";

import { useActionState, useState } from "react";
import { TriangleAlert } from "lucide-react";
import {
  Button,
  ButtonLink,
  Field,
  FormError,
  FormSection,
  Modal,
  TextareaField,
} from "@/components/ui";
import { PriceFields } from "@/components/listings/price-fields";
import { WeeklyAvailabilityField } from "@/components/listings/weekly-availability-field";
import { RentalDurationField } from "@/components/listings/rental-duration-field";
import { BlackoutRulesField } from "@/components/listings/blackout-rules-field";
import type { BundleFormState } from "@/app/listings/mine/bundles/actions";
import { formatMoney, todayIso } from "@/lib/format";
import { MIN_BUNDLE_ITEMS, type Bundle } from "@/lib/bundles";
import { CATEGORY_LABELS } from "@/lib/listings";

/** One row of the item picker: an ACTIVE listing the owner could include. */
export type SelectableListing = {
  id: string;
  name: string;
  category: string;
  brand: string;
  price_per_day_cents: number | null;
  price_per_week_cents: number | null;
};

/**
 * The create and edit forms for a gear bundle (S2-20 Scenarios 1 and 3).
 *
 * One component for both, the way listing-form.tsx serves both listing
 * forms: `editing` drives every difference, so a field added here cannot
 * appear on one and be forgotten on the other. The server action is passed
 * in already bound to a bundle id where there is one, so the form never
 * carries the id in a field a request body could swap.
 *
 * Laid out as the same sequence of FormSection panels the listing form uses,
 * minus the photo and serial steps: a bundle records no condition evidence of
 * its own, because each component listing already carries its own passport.
 */
export function BundleForm({
  action,
  activeListings,
  profileAvailableDays,
  depositCapBps,
  bundle,
}: {
  action: (state: BundleFormState, formData: FormData) => Promise<BundleFormState>;
  /** The owner's ACTIVE listings - the only ones a bundle may contain. */
  activeListings: SelectableListing[];
  /** The profile-wide weekly schedule a bundle falls back to. */
  profileAvailableDays: number[];
  /** Basis points (10000 = 100%) a deposit may not exceed of the weekly-equivalent rate. */
  depositCapBps: number;
  /** Omitted when creating. */
  bundle?: Bundle;
}) {
  const editing = bundle !== undefined;
  const [state, formAction, pending] = useActionState<BundleFormState, FormData>(action, undefined);
  const errors = state?.fieldErrors ?? {};

  const [name, setName] = useState(bundle?.name ?? "");
  const [description, setDescription] = useState(bundle?.description ?? "");
  const [selected, setSelected] = useState<string[]>(() => bundle?.items.map((item) => item.id) ?? []);

  // The three availability controls constrain one another: nothing may be
  // offered or blacked out before today, and the window's own end cannot
  // precede its start. Holding the two dates here is what lets the calendar
  // below offer only the days the bundle is actually open for.
  const today = todayIso();
  const [availableFrom, setAvailableFrom] = useState(bundle?.available_from ?? "");
  const [availableUntil, setAvailableUntil] = useState(bundle?.available_until ?? "");
  // The window may already have opened on an edit. Unlike a listing, that is
  // not frozen: a bundle has no bookings of its own to honour, so the API
  // only refuses a start date in the past, which this input already prevents.
  const [customAvailability, setCustomAvailability] = useState(bundle?.has_custom_availability ?? false);
  const [customDays, setCustomDays] = useState<number[]>(
    bundle?.custom_available_days ?? profileAvailableDays,
  );
  const weeklyDays = customAvailability ? customDays : profileAvailableDays;
  // Blackouts are picked from today onward even when the window opened
  // earlier, since a past day cannot be blocked.
  const calendarFrom = availableFrom && availableFrom > today ? availableFrom : today;

  // A component that has since left ACTIVE is what unpublished the bundle
  // (Scenario 6). It cannot be re-selected, so rather than vanishing from the
  // form - leaving the owner wondering what changed - it is listed as the
  // thing to drop before the bundle can go back up.
  const selectableIds = new Set(activeListings.map((listing) => listing.id));
  const strandedItems = bundle?.items.filter((item) => !selectableIds.has(item.id)) ?? [];
  const tooFewToBundle = activeListings.length < MIN_BUNDLE_ITEMS;

  // Each save produces a fresh state object, so remembering which one the
  // owner dismissed shows the modal once per save rather than on every
  // re-render after it.
  const [dismissedNotice, setDismissedNotice] = useState<BundleFormState>(undefined);
  const saved = state?.success;
  const showSavedModal = saved !== undefined && state !== dismissedNotice;

  function toggle(listingId: string) {
    setSelected((current) =>
      current.includes(listingId) ? current.filter((id) => id !== listingId) : [...current, listingId],
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <FormSection title="The bundle">
        <Field
          label="Bundle name"
          id="name"
          name="name"
          maxLength={200}
          required
          placeholder="Weekend vlogging kit"
          error={errors.name}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <TextareaField
          label="Description"
          id="description"
          name="description"
          rows={4}
          maxLength={5000}
          hint="What the set is for, and anything a renter should know about taking it all at once."
          error={errors.description}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </FormSection>

      <FormSection title="Items">
        <div>
          <span className="block text-sm font-medium">
            Items in this bundle
            <span aria-hidden="true" className="text-accent"> *</span>
          </span>
          <p className="body-copy mt-1">
            Choose at least {MIN_BUNDLE_ITEMS} of your published listings. They stay individually
            bookable — a bundle groups them, it does not take them off the marketplace.
          </p>

          {tooFewToBundle ? (
            <p role="alert" className="mt-3 rounded-lg border-l-2 border-accent bg-accent-soft px-3 py-2 text-sm text-ink">
              You need at least {MIN_BUNDLE_ITEMS} published listings to make a bundle. Publish
              another listing first, then come back.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {activeListings.map((listing) => {
                const checked = selected.includes(listing.id);
                return (
                  <li key={listing.id}>
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                        checked ? "border-ink bg-surface-muted" : "border-line hover:border-ink"
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="listing_ids"
                        value={listing.id}
                        checked={checked}
                        onChange={() => toggle(listing.id)}
                        className="mt-1 size-4 accent-ink"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{listing.name}</span>
                        <span className="body-copy block">
                          {CATEGORY_LABELS[listing.category] ?? listing.category} · {listing.brand}
                          {listing.price_per_day_cents !== null && ` · ${formatMoney(listing.price_per_day_cents)} / day`}
                          {listing.price_per_week_cents !== null && ` · ${formatMoney(listing.price_per_week_cents)} / week`}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          {errors.listing_ids && (
            <p role="alert" className="mt-2 text-xs text-accent-dark">
              {errors.listing_ids}
            </p>
          )}
        </div>

        {strandedItems.length > 0 && (
          <div className="flex gap-3 rounded-lg border-l-2 border-accent bg-accent-soft px-3 py-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
            <p className="text-sm text-ink">
              {strandedItems.map((item) => item.name).join(", ")}{" "}
              {strandedItems.length === 1 ? "is" : "are"} no longer published, which is why this
              bundle is unpublished. Saving without {strandedItems.length === 1 ? "it" : "them"}{" "}
              puts the bundle back in the marketplace — or republish the listing to restore the
              bundle as it is.
            </p>
          </div>
        )}
      </FormSection>

      <FormSection title="Price">
        <PriceFields
          depositCapBps={depositCapBps}
          priceError={errors.price_per_day_cents ?? errors.price_per_week_cents}
          depositError={errors.deposit_cents}
          initial={bundle}
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
            min={availableFrom > today ? availableFrom : today}
            value={availableUntil}
            onChange={(event) => setAvailableUntil(event.target.value)}
            hint="Optional. Leave blank to stay listed indefinitely."
            error={errors.available_until}
          />
        </div>

        <WeeklyAvailabilityField
          subject="bundle"
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
          initialMin={bundle?.min_rental_days ?? undefined}
          initialMax={editing ? bundle.max_rental_days : undefined}
        />

        <BlackoutRulesField
          subject="bundle"
          availableFrom={calendarFrom}
          availableUntil={availableUntil}
          weeklyDays={weeklyDays}
          initialRanges={bundle?.blackout_dates}
          error={errors.blackout_dates}
        />

        <p className="body-copy">
          These narrow when the bundle is offered. It is only ever bookable on dates every item in
          it is already free, so these rules can take days away but never add them.
        </p>
      </FormSection>

      <div className="rounded-2xl border border-line bg-surface-muted p-6 sm:p-8">
        <FormError message={state?.error} />
        <Button type="submit" disabled={pending || tooFewToBundle} className="w-full sm:w-auto">
          {editing ? (pending ? "Saving…" : "Save changes") : pending ? "Publishing…" : "Publish bundle"}
        </Button>
        <p className="body-copy mt-4">
          {editing
            ? "Changes apply to new bookings only. Anyone who has already booked keeps the terms they agreed to, and the listings inside stay published either way."
            : "Publishing puts this in the marketplace straight away. The listings inside stay bookable on their own."}
        </p>
      </div>

      {showSavedModal && (
        <Modal title="Changes saved" onClose={() => setDismissedNotice(state)}>
          <p className="body-copy mt-4">
            Changes saved successfully.
            <br />
            Note: Changes apply to new bookings only. Anyone who has already booked keeps the terms
            they agreed to. Your individual listings are unchanged and still bookable on their own.
          </p>
          {saved.republished && (
            <p className="body-copy mt-3">
              &ldquo;{saved.name}&rdquo; is published again and back in the marketplace.
            </p>
          )}
          <div className="mt-6 flex justify-end">
            <ButtonLink href="/listings/mine">Back to my inventory</ButtonLink>
          </div>
        </Modal>
      )}
    </form>
  );
}
