import type { FieldErrors } from "@/lib/api/client";

const CONTACT_NUMBER_PATTERN = /^[0-9+()\-\s]{7,20}$/;

const MAX_DISPLAY_NAME = 60;
const MAX_LOCATION = 120;
const MAX_BIO = 500;

/**
 * What a member tells us about themselves, at onboarding and afterwards.
 *
 * The pickup location is optional at this layer because whether it is
 * *required* depends on the roles held — see `parseContactDetails`. A member
 * who only rents never hands gear over, so they have none to give; a renter is
 * not asked where they collect, because collection is agreed per booking.
 */
export type ContactDetails = {
  contact_number: string;
  default_pickup_location: string | null;
  bio: string | null;
};

export type ContactDetailsResult =
  | { ok: true; values: ContactDetails }
  | { ok: false; fieldErrors: FieldErrors };

/** Which sides of the marketplace the member is on, which fields are required. */
export type Roles = { wantsToRent: boolean; wantsToOwn: boolean };

/**
 * The display name rule, shared by onboarding and the Account tab so the two
 * cannot disagree about what counts as a name.
 */
export function validateDisplayName(displayName: string): string | null {
  if (!displayName) return "Enter a display name.";
  if (displayName.length > MAX_DISPLAY_NAME) {
    return `Display name must be ${MAX_DISPLAY_NAME} characters or fewer.`;
  }
  return null;
}

/**
 * Reads and validates the contact fields shared by onboarding and the
 * profile's Account tab, so the two forms cannot drift apart on what counts
 * as a valid contact number or location.
 *
 * Takes the whole `Roles` pair although only the owning side gates a field:
 * callers already hold one, and passing it keeps the contract "the rules
 * depend on the roles" rather than "the rules depend on one boolean", which is
 * what would have to be unpicked if a renter-side rule ever returns.
 *
 * Every field is checked before returning, rather than stopping at the first
 * failure: the form renders a message against each control, and fixing one
 * error only to be shown the next is the behaviour that makes people give up.
 */
export function parseContactDetails(
  formData: FormData,
  { wantsToOwn }: Roles,
): ContactDetailsResult {
  const contactNumber = String(formData.get("contact_number") ?? "").trim();
  const pickupLocation = String(formData.get("default_pickup_location") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  const fieldErrors: FieldErrors = {};

  if (!contactNumber || !CONTACT_NUMBER_PATTERN.test(contactNumber)) {
    fieldErrors.contact_number = "Enter a valid contact number (digits, spaces, + and - only).";
  }

  // Required only of an owner. Asking a renter where they hand gear over is a
  // question they cannot answer.
  if (wantsToOwn && !pickupLocation) {
    fieldErrors.default_pickup_location = "Choose where you would usually hand gear over.";
  }

  if (pickupLocation.length > MAX_LOCATION) {
    fieldErrors.default_pickup_location = `Must be ${MAX_LOCATION} characters or fewer.`;
  }
  if (bio.length > MAX_BIO) {
    fieldErrors.bio = `Bio must be ${MAX_BIO} characters or fewer.`;
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  return {
    ok: true,
    values: {
      contact_number: contactNumber,
      // Stored as null rather than "" for a role not held, so "not applicable"
      // and "not answered yet" read the same way as every other nullable
      // column on profiles.
      default_pickup_location: pickupLocation || null,
      bio: bio || null,
    },
  };
}
