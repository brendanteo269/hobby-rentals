const CONTACT_NUMBER_PATTERN = /^[0-9+()\-\s]{7,20}$/;

export type ContactDetails = {
  contact_number: string;
  preferred_meetup_location: string;
  bio: string | null;
};

/**
 * Reads and validates the contact fields shared by onboarding and the
 * profile's Account tab, so the two forms cannot drift apart on what counts
 * as a valid contact number or meetup location.
 */
export type ContactDetailsResult =
  | { ok: true; values: ContactDetails }
  | { ok: false; error: string };

export function parseContactDetails(formData: FormData): ContactDetailsResult {
  const contactNumber = String(formData.get("contact_number") ?? "").trim();
  const preferredMeetupLocation = String(formData.get("preferred_meetup_location") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  if (!contactNumber || !CONTACT_NUMBER_PATTERN.test(contactNumber)) {
    return { ok: false, error: "Enter a valid contact number (digits, spaces, + and - only)." };
  }
  if (!preferredMeetupLocation) {
    return { ok: false, error: "Preferred meetup location is required." };
  }
  if (preferredMeetupLocation.length > 120) {
    return { ok: false, error: "Preferred meetup location must be 120 characters or fewer." };
  }
  if (bio.length > 500) {
    return { ok: false, error: "Bio must be 500 characters or fewer." };
  }

  return {
    ok: true,
    values: {
      contact_number: contactNumber,
      preferred_meetup_location: preferredMeetupLocation,
      bio: bio || null,
    },
  };
}
