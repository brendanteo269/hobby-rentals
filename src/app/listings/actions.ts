"use server";

import { redirect } from "next/navigation";
import { createListing, ListingApiError } from "@/lib/api/listings";
import {
  isCategory,
  isCondition,
  isLocationArea,
  type BlackoutRule,
  type CreateListingRequest,
} from "@/lib/listings";

export type CreateListingState =
  | {
      /** The form's overall outcome, shown above the submit button. */
      error?: string;
      /** Keyed by field name, shown under the field it names. */
      fieldErrors?: Record<string, string>;
    }
  | undefined;

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

/**
 * Reads a money field as integer cents.
 *
 * The form collects dollars, because that is what an owner is pricing in, but
 * the API speaks cents everywhere. Rounding rather than truncating keeps
 * "10.005" from quietly becoming $10.00. Returns null for a blank optional
 * field; a malformed one becomes NaN and is caught by the checks below.
 */
function cents(formData: FormData, name: string): number | null {
  const raw = text(formData, name);
  if (!raw) return null;
  return Math.round(Number(raw) * 100);
}

function count(formData: FormData, name: string): number | null {
  const raw = text(formData, name);
  return raw ? Number(raw) : null;
}

/**
 * Parses the blackout rules the client component serialised into a hidden
 * field. Malformed JSON means the field was tampered with rather than filled
 * in, so it is dropped: FastAPI validates the rules it does receive, and an
 * unreadable blob has no field of its own to complain against.
 */
function blackoutRules(formData: FormData): BlackoutRule[] {
  const raw = text(formData, "blackout_dates");
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BlackoutRule[]) : [];
  } catch {
    return [];
  }
}

/**
 * Creates a listing and sends the owner to the marketplace to see it.
 *
 * Validation is left to FastAPI rather than repeated here: it already returns
 * a message per field, and a second set of rules in this file would be one
 * more place to drift from the backend's. This only checks what it must to
 * build a well-typed request — the enums, which the API would reject with a
 * message written for a developer, not an owner.
 */
export async function submitListing(
  _prev: CreateListingState,
  formData: FormData,
): Promise<CreateListingState> {
  const category = text(formData, "category");
  const condition = text(formData, "condition");
  const locationArea = text(formData, "location_area");

  const fieldErrors: Record<string, string> = {};
  if (!isCategory(category)) fieldErrors.category = "Choose a category.";
  if (!isCondition(condition)) fieldErrors.condition = "Choose the item's condition.";
  if (!isLocationArea(locationArea)) fieldErrors.location_area = "Choose a collection area.";

  const pricePerDay = cents(formData, "price_per_day");
  const deposit = cents(formData, "deposit");
  if (pricePerDay === null || Number.isNaN(pricePerDay)) {
    fieldErrors.price_per_day_cents = "Enter a daily rate, e.g. 25.00";
  }
  if (deposit === null || Number.isNaN(deposit)) {
    fieldErrors.deposit_cents = "Enter a deposit amount, or 0 for none.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Please correct the highlighted fields.", fieldErrors };
  }

  const request: CreateListingRequest = {
    name: text(formData, "name"),
    description: text(formData, "description"),
    brand: text(formData, "brand"),
    category: category as CreateListingRequest["category"],
    condition: condition as CreateListingRequest["condition"],
    location_area: locationArea as CreateListingRequest["location_area"],
    price_per_day_cents: pricePerDay!,
    deposit_cents: deposit!,
    price_per_week_cents: cents(formData, "price_per_week"),
    min_rental_days: count(formData, "min_rental_days"),
    max_rental_days: count(formData, "max_rental_days"),
    available_from: text(formData, "available_from"),
    available_until: text(formData, "available_until") || null,
    blackout_dates: blackoutRules(formData),
  };

  try {
    await createListing(request);
  } catch (caught) {
    if (caught instanceof ListingApiError) {
      return { error: caught.message, fieldErrors: caught.fieldErrors };
    }
    throw caught;
  }

  // Outside the try: redirect signals by throwing, and catching it here would
  // report a successful creation as a failure.
  redirect("/browse");
}
