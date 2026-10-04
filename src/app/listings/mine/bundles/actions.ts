"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BundleApiError, createBundle, getBundle, removeBundle, updateBundle } from "@/lib/api/bundles";
import { dollarsToCents } from "@/lib/format";
import {
  MIN_BUNDLE_ITEMS,
  type Bundle,
  type CreateBundleRequest,
  type UpdateBundleRequest,
} from "@/lib/bundles";
import type { DateRange } from "@/lib/listings";

/** Shared by the create and edit forms, which render the same fields. */
export type BundleFormState =
  | {
      /** The form's overall outcome, shown above the submit button. */
      error?: string;
      /** Keyed by field name, shown under the field it names. */
      fieldErrors?: Record<string, string>;
      /** Set once an edit has been saved - create redirects instead. */
      success?: {
        name: string;
        /**
         * S2-20 Scenario 6: amending an unpublished bundle is what puts it
         * back in the marketplace, so the owner is told that happened rather
         * than left to check the status badge.
         */
        republished: boolean;
      };
    }
  | undefined;

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

/**
 * Reads a money field as integer cents. Returns null for a blank optional
 * field; a malformed one becomes NaN and is caught by the checks below.
 */
function cents(formData: FormData, name: string): number | null {
  return dollarsToCents(text(formData, name));
}

function count(formData: FormData, name: string): number | null {
  const raw = text(formData, name);
  return raw ? Number(raw) : null;
}

/**
 * Parses a JSON list a client component serialised into a hidden field.
 * Malformed JSON means the field was tampered with rather than filled in, so
 * it is dropped: FastAPI validates the items it does receive, and an
 * unreadable blob has no field of its own to complain against.
 */
function hiddenList<T>(formData: FormData, name: string, keep: (item: unknown) => item is T): T[] {
  const raw = text(formData, name);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(keep) : [];
  } catch {
    return [];
  }
}

const isNumber = (value: unknown): value is number => typeof value === "number";
const isDateRange = (value: unknown): value is DateRange =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as DateRange).start_date === "string" &&
  typeof (value as DateRange).end_date === "string";

/** Every field both bundle forms submit, which is every field the API takes. */
type BundleFields = Required<Omit<CreateBundleRequest, "description" | "price_per_day_cents" | "price_per_week_cents">> &
  Pick<CreateBundleRequest, "description" | "price_per_day_cents" | "price_per_week_cents">;

type ParsedBundle =
  | { fieldErrors: Record<string, string>; fields?: undefined }
  | { fields: BundleFields; fieldErrors?: undefined };

/**
 * The checks worth making before a round trip: the ones whose message is
 * about the form rather than about stored state. Ownership and whether each
 * component is still ACTIVE are the server's to answer, and are left to it.
 */
function parseBundleFields(formData: FormData): ParsedBundle {
  const fieldErrors: Record<string, string> = {};

  const name = text(formData, "name");
  if (!name) fieldErrors.name = "Give the bundle a name.";

  const listingIds = formData.getAll("listing_ids").map(String).filter(Boolean);
  if (listingIds.length < MIN_BUNDLE_ITEMS) {
    fieldErrors.listing_ids = `Choose at least ${MIN_BUNDLE_ITEMS} items for the bundle.`;
  }

  // PriceFields mounts a box under whichever one name the owner picked -
  // never both, never neither once they have chosen - so exactly one of
  // these two is expected to hold a value, exactly as on the listing form.
  const pricePerDay = cents(formData, "price_per_day");
  const pricePerWeek = cents(formData, "price_per_week");
  const deposit = cents(formData, "deposit");

  const noDay = pricePerDay === null || Number.isNaN(pricePerDay);
  const noWeek = pricePerWeek === null || Number.isNaN(pricePerWeek);
  if (noDay && noWeek) {
    fieldErrors.price_per_week_cents = "Choose per day or per week, and enter a rate.";
  }
  if (deposit === null || Number.isNaN(deposit)) {
    fieldErrors.deposit_cents = "Enter a deposit amount, or 0 for none.";
  }

  const availableFrom = text(formData, "available_from");
  if (!availableFrom) fieldErrors.available_from = "Choose when the bundle becomes available.";

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const custom = text(formData, "has_custom_availability") === "true";
  return {
    fields: {
      name,
      description: text(formData, "description") || null,
      listing_ids: listingIds,
      price_per_day_cents: pricePerDay,
      price_per_week_cents: pricePerWeek,
      deposit_cents: deposit!,
      available_from: availableFrom,
      available_until: text(formData, "available_until") || null,
      has_custom_availability: custom,
      custom_available_days: custom ? hiddenList(formData, "custom_available_days", isNumber) : null,
      min_rental_days: count(formData, "min_rental_days"),
      max_rental_days: count(formData, "max_rental_days"),
      blackout_dates: hiddenList(formData, "initial_blackouts", isDateRange),
    },
  };
}

/** S2-20 Scenario 1: creates the bundle and publishes it in one step. */
export async function createMyBundle(
  _prev: BundleFormState,
  formData: FormData,
): Promise<BundleFormState> {
  const parsed = parseBundleFields(formData);
  if (parsed.fieldErrors) {
    return { error: "Please correct the highlighted fields.", fieldErrors: parsed.fieldErrors };
  }

  let created: Bundle;
  try {
    created = await createBundle(parsed.fields);
  } catch (caught) {
    if (caught instanceof BundleApiError) return { error: caught.message, fieldErrors: caught.fieldErrors };
    throw caught;
  }

  revalidatePath("/listings/mine/bundles");
  // Outside the try: redirect signals by throwing, and catching it here would
  // report a successful creation as a failure.
  redirect(`/bundles/${created.id}`);
}

/**
 * Which submitted fields differ from the stored bundle.
 *
 * PATCH is a partial update and membership is the expensive half - it
 * rewrites bundle_items and can republish the bundle - so an edit that only
 * renamed it should not resend the same item list.
 */
function changedFields(candidate: BundleFields, current: Bundle): UpdateBundleRequest {
  const changes: UpdateBundleRequest = {};

  for (const key of ["name", "description", "price_per_day_cents", "price_per_week_cents", "deposit_cents", "available_from", "available_until", "has_custom_availability", "min_rental_days", "max_rental_days"] as const) {
    if (candidate[key] !== current[key]) Object.assign(changes, { [key]: candidate[key] });
  }
  // Order is not meaning for either of these, so they are compared sorted.
  const sameDays = (a: number[] | null | undefined, b: number[] | null) =>
    JSON.stringify(a ? [...a].sort() : null) === JSON.stringify(b ? [...b].sort() : null);
  if (!sameDays(candidate.custom_available_days, current.custom_available_days)) {
    changes.custom_available_days = candidate.custom_available_days;
  }
  const rangeKey = (range: DateRange) => `${range.start_date}|${range.end_date}`;
  if (
    JSON.stringify(candidate.blackout_dates.map(rangeKey).sort()) !==
    JSON.stringify(current.blackout_dates.map(rangeKey).sort())
  ) {
    changes.blackout_dates = candidate.blackout_dates;
  }

  const currentIds = [...current.items.map((item) => item.id)].sort();
  if (JSON.stringify([...candidate.listing_ids].sort()) !== JSON.stringify(currentIds)) {
    changes.listing_ids = candidate.listing_ids;
  }
  return changes;
}

/**
 * S2-20 Scenario 3: saves an edit to the caller's own bundle. Bound to a
 * bundle id by the edit page, so the form itself never carries the id where
 * a request body could swap it.
 *
 * Stays on the page rather than redirecting, so the owner can be told whether
 * the edit republished an unpublished bundle.
 */
export async function updateMyBundle(
  bundleId: string,
  _prev: BundleFormState,
  formData: FormData,
): Promise<BundleFormState> {
  const parsed = parseBundleFields(formData);
  if (parsed.fieldErrors) {
    return { error: "Please correct the highlighted fields.", fieldErrors: parsed.fieldErrors };
  }

  try {
    // Re-read rather than trusting hidden "original value" fields: the diff
    // must be against what is stored, and this also 404s early for a bundle
    // that is not the caller's.
    const current = await getBundle(bundleId);
    const changes = changedFields(parsed.fields, current);
    const saved = Object.keys(changes).length > 0 ? await updateBundle(bundleId, changes) : current;

    revalidatePath("/listings/mine/bundles");
    revalidatePath(`/bundles/${bundleId}`);
    return {
      success: {
        name: saved.name,
        republished: current.status === "UNPUBLISHED" && saved.status === "ACTIVE",
      },
    };
  } catch (caught) {
    if (caught instanceof BundleApiError) return { error: caught.message, fieldErrors: caught.fieldErrors };
    throw caught;
  }
}

export type BundleActionResult = { error: string } | { bundle: Bundle };

/** S2-20 Scenario 3: the component listings are untouched and stay independently bookable. */
export async function removeMyBundle(bundleId: string): Promise<BundleActionResult> {
  try {
    const bundle = await removeBundle(bundleId);
    revalidatePath("/listings/mine/bundles");
    return { bundle };
  } catch (caught) {
    if (caught instanceof BundleApiError) return { error: caught.message };
    throw caught;
  }
}
