"use server";

import { redirect } from "next/navigation";
import { createListing, ListingApiError } from "@/lib/api/listings";
import { dollarsToCents } from "@/lib/format";
import {
  isCategory,
  isCondition,
  isLocationArea,
  type BlackoutDate,
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
 * Returns null for a blank optional field; a malformed one becomes NaN and
 * is caught by the checks below. See dollarsToCents for the dollars->cents
 * rounding this shares with the client-side deposit-cap hint.
 */
function cents(formData: FormData, name: string): number | null {
  return dollarsToCents(text(formData, name));
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
function initialBlackouts(formData: FormData): BlackoutDate[] {
  const raw = text(formData, "initial_blackouts");
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BlackoutDate[]) : [];
  } catch {
    return [];
  }
}

/**
 * Parses the photo keys PhotoUploadField serialised into a hidden field —
 * each one already uploaded to S3 by the time the form is submitted. Same
 * "malformed means tampered, so drop it" handling as blackoutRules: FastAPI
 * re-checks every key belongs to this owner regardless of what arrives here.
 */
function photoKeys(formData: FormData): string[] {
  const raw = text(formData, "photo_keys");
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
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
  const photos = photoKeys(formData);

  const fieldErrors: Record<string, string> = {};
  if (!isCategory(category)) fieldErrors.category = "Choose a category.";
  if (!isCondition(condition)) fieldErrors.condition = "Choose the item's condition.";
  if (!isLocationArea(locationArea)) fieldErrors.location_area = "Choose a collection area.";
  // PhotoUploadField already uploads each photo as it's picked, so by submit
  // time this is just a count check — not worth a round trip to FastAPI when
  // the answer is already sitting in the hidden field.
  if (photos.length === 0) fieldErrors.photo_keys = "Add at least one photo.";

  // PricePerBlockField mounts a box under whichever one name the owner
  // picked — never both, never neither once they have chosen — so exactly
  // one of these two is expected to hold a value.
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
    price_per_day_cents: pricePerDay,
    price_per_week_cents: pricePerWeek,
    deposit_cents: deposit!,
    min_rental_days: count(formData, "min_rental_days"),
    max_rental_days: count(formData, "max_rental_days"),
    available_from: text(formData, "available_from"),
    available_until: text(formData, "available_until") || null,
    has_custom_availability: text(formData, "has_custom_availability") === "true",
    custom_available_days: (() => { try { return JSON.parse(text(formData, "custom_available_days")) as number[]; } catch { return []; } })(),
    initial_blackouts: initialBlackouts(formData),
    photo_keys: photos,
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
