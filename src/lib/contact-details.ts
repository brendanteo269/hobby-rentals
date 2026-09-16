import type { FieldErrors } from "@/lib/api/client";

const CONTACT_NUMBER_PATTERN = /^[0-9+()\-\s]{7,20}$/;

const MAX_DISPLAY_NAME = 60;
const MAX_LOCATION = 120;
const MAX_BIO = 500;

/**
 * What a member tells us about themselves, at onboarding and afterwards.
 *
 * The two locations are both optional at this layer because which of them is
 * *required* depends on the roles held — see `parseContactDetails`. A renter
 * has no pickup location to give, and an owner who never rents has no meetup
 * location.
 */
export type ContactDetails = {
  contact_number: string;
  preferred_meetup_location: string | null;
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
 * Every field is checked before returning, rather than stopping at the first
 * failure: the form renders a message against each control, and fixing one
 * error only to be shown the next is the behaviour that makes people give up.
 */
export function parseContactDetails(
  formData: FormData,
  { wantsToRent, wantsToOwn }: Roles,
): ContactDetailsResult {
  const contactNumber = String(formData.get("contact_number") ?? "").trim();
  const meetupLocation = String(formData.get("preferred_meetup_location") ?? "").trim();
  const pickupLocation = String(formData.get("default_pickup_location") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  const fieldErrors: FieldErrors = {};

  if (!contactNumber || !CONTACT_NUMBER_PATTERN.test(contactNumber)) {
    fieldErrors.contact_number = "Enter a valid contact number (digits, spaces, + and - only).";
  }

  // Required only for the side the member is actually on. Asking a renter
  // where they hand gear over is a question they cannot answer.
  if (wantsToRent && !meetupLocation) {
    fieldErrors.preferred_meetup_location = "Choose where you would usually collect gear.";
  }
  if (wantsToOwn && !pickupLocation) {
    fieldErrors.default_pickup_location = "Choose where you would usually hand gear over.";
  }

  if (meetupLocation.length > MAX_LOCATION) {
    fieldErrors.preferred_meetup_location = `Must be ${MAX_LOCATION} characters or fewer.`;
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
      preferred_meetup_location: meetupLocation || null,
      default_pickup_location: pickupLocation || null,
      bio: bio || null,
    },
  };
}
