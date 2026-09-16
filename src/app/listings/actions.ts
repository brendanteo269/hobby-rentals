"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createListing, getListing, ListingApiError, updateListing as patchListing } from "@/lib/api/listings";
import { dollarsToCents } from "@/lib/format";
import {
  isCategory,
  isCondition,
  isLocationArea,
  type BlackoutDate,
  type CreateListingRequest,
  type Listing,
  type UpdateListingRequest,
} from "@/lib/listings";

/** Shared by the create and edit forms, which render the same fields. */
export type ListingFormState =
  | {
      /** The form's overall outcome, shown above the submit button. */
      error?: string;
      /** Keyed by field name, shown under the field it names. */
      fieldErrors?: Record<string, string>;
      /** Set once an edit has been saved - create redirects instead. */
      success?: {
        /** See UpdateListingResponse.active_booking_count. */
        activeBookingCount: number;
      };
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

const isString = (value: unknown): value is string => typeof value === "string";
const isNumber = (value: unknown): value is number => typeof value === "number";
const isBlackout = (value: unknown): value is BlackoutDate => typeof value === "object" && value !== null;

/**
 * The fields both forms share, every one present. available_from is the
 * exception: the edit form disables it once the window has opened, and a
 * disabled input is not submitted at all.
 */
type ListingFields = Omit<Required<UpdateListingRequest>, "available_from"> &
  Pick<UpdateListingRequest, "available_from">;

/**
 * Everything the create and edit forms have in common, read off the form.
 *
 * Validation is left to FastAPI rather than repeated here: it already returns
 * a message per field, and a second set of rules in this file would be one
 * more place to drift from the backend's. This only checks what it must to
 * build a well-typed request — the enums, which the API would reject with a
 * message written for a developer, not an owner.
 */
function parseListingFields(
  formData: FormData,
): { fieldErrors: Record<string, string> } | { fieldErrors?: undefined; fields: ListingFields } {
  const category = text(formData, "category");
  const condition = text(formData, "condition");
  const locationArea = text(formData, "location_area");
  const photos = hiddenList(formData, "photo_keys", isString);

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

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  return {
    fields: {
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
      // Blank when the edit form disabled the input because the window has
      // already opened; the edit path reads that as "unchanged" rather than
      // as a new value.
      ...(text(formData, "available_from") ? { available_from: text(formData, "available_from") } : {}),
      available_until: text(formData, "available_until") || null,
      photo_keys: photos,
    },
  };
}

/** Creates a listing and sends the owner to the marketplace to see it. */
export async function submitListing(
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const parsed = parseListingFields(formData);
  if (parsed.fieldErrors) {
    return { error: "Please correct the highlighted fields.", fieldErrors: parsed.fieldErrors };
  }

  const request: CreateListingRequest = {
    ...parsed.fields,
    // Required on create. The form's own `required` makes a blank one rare;
    // when it does arrive, FastAPI names the field, which this does not.
    available_from: parsed.fields.available_from ?? "",
    has_custom_availability: text(formData, "has_custom_availability") === "true",
    custom_available_days: hiddenList(formData, "custom_available_days", isNumber),
    initial_blackouts: hiddenList(formData, "initial_blackouts", isBlackout),
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

/**
 * Which submitted fields actually differ from the stored listing.
 *
 * The API is a partial update, and sending everything would defeat that in
 * one concrete way: an available_from that has already passed is rejected
 * whenever it appears in the body, even unchanged, because the API cannot
 * tell "same value" from "new value". Diffing here is what keeps a price
 * edit on an already-open listing from failing on a field the owner never
 * touched.
 */
function changedFields(candidate: UpdateListingRequest, current: Listing): UpdateListingRequest {
  const changes: UpdateListingRequest = {};
  for (const key of Object.keys(candidate) as (keyof UpdateListingRequest)[]) {
    const next = candidate[key];
    const prev = current[key];
    const same =
      Array.isArray(next) && Array.isArray(prev)
        ? JSON.stringify(next) === JSON.stringify(prev)
        : next === prev;
    if (!same) Object.assign(changes, { [key]: next });
  }
  return changes;
}

/**
 * S1-10: saves an edit to the caller's own listing. Bound to a listing id by
 * the edit page, so the form itself never carries the id where a request
 * body could swap it.
 *
 * Stays on the page rather than redirecting: Scenario 4 wants the owner told
 * that existing bookings keep their terms, and that is a modal on this form,
 * not a message to smuggle through a query string.
 */
export async function updateListing(
  listingId: string,
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const parsed = parseListingFields(formData);
  if (parsed.fieldErrors) {
    return { error: "Please correct the highlighted fields.", fieldErrors: parsed.fieldErrors };
  }

  try {
    // Re-read rather than trusting hidden "original value" fields: the diff
    // must be against what is stored, and this also 404s early for a listing
    // that is not the caller's.
    const current = await getListing(listingId);
    const { active_booking_count } = await patchListing(listingId, changedFields(parsed.fields, current));

    revalidatePath("/listings/mine");
    revalidatePath(`/listings/${listingId}`);
    return { success: { activeBookingCount: active_booking_count } };
  } catch (caught) {
    if (caught instanceof ListingApiError) {
      return { error: caught.message, fieldErrors: caught.fieldErrors };
    }
    throw caught;
  }
}
