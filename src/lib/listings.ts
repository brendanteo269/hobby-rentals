/**
 * Listing vocabulary: the shape of a listing and the words shown for it.
 *
 * Deliberately free of `server-only` and of any transport code, because both
 * the browse filters (rendered on the server) and the create form (a client
 * component, for its pending state) need these labels. The calls themselves
 * live in @/lib/api/listings.
 *
 * The enums mirror app/listing_service.py. They are duplicated rather than
 * derived because the backend is a separate deployable: a value added there
 * should fail type-checking here until this file gets it, which is the
 * reminder that it needs a label too.
 */

export type ListingCategory = string;

export type ListingCondition = "NEW" | "GOOD" | "FAIR" | "POOR";

// Real collection areas rather than compass regions - specific enough that a
// renter searching "Tiong Bahru" gets Tiong Bahru, not everything in the
// southern half of the island.
export type LocationArea =
  | "ANG_MO_KIO"
  | "BEDOK"
  | "BISHAN"
  | "BUKIT_BATOK"
  | "BUKIT_MERAH"
  | "BUKIT_PANJANG"
  | "BUKIT_TIMAH"
  | "CHOA_CHU_KANG"
  | "CLEMENTI"
  | "DOWNTOWN_CORE"
  | "EAST_COAST"
  | "GEYLANG"
  | "HOUGANG"
  | "JURONG_EAST"
  | "JURONG_WEST"
  | "KALLANG"
  | "MARINE_PARADE"
  | "NOVENA"
  | "ORCHARD"
  | "PASIR_RIS"
  | "PUNGGOL"
  | "QUEENSTOWN"
  | "SEMBAWANG"
  | "SENGKANG"
  | "SENTOSA"
  | "SERANGOON"
  | "TAMPINES"
  | "TIONG_BAHRU"
  | "TOA_PAYOH"
  | "WOODLANDS"
  | "YISHUN";

export type ListingStatus = "DRAFT" | "ACTIVE" | "ARCHIVED" | "PENDING_REMOVAL" | "REMOVED";

/** An inclusive span of calendar days, both ends as ISO dates (YYYY-MM-DD). */
export type DateRange = { start_date: string; end_date: string };

/**
 * Why a date inside a listing's window cannot be booked. Mirrors
 * booking_service.UnavailableReason.
 *
 * BOOKED and WAITLIST_HOLD are the ones a renter might act on — those dates
 * could free up, and can be queued for — so they are labelled distinctly
 * from the two the owner chose. A date *outside* the window carries no reason and appears in
 * neither list: there is nothing to explain about a day the listing never
 * covered.
 */
export type UnavailableReason = "BOOKED" | "BLACKOUT" | "OFF_SCHEDULE" | "WAITLIST_HOLD";

export type UnavailableDate = { date: string; reason: UnavailableReason };

export const UNAVAILABLE_REASON_LABELS: Record<UnavailableReason, string> = {
  BOOKED: "Booked",
  BLACKOUT: "Unavailable",
  OFF_SCHEDULE: "Not offered on this day",
  // S2-15: free of bookings, but inside someone else's 24-hour waitlist
  // window. Like BOOKED, it may open up shortly, and can be queued behind.
  WAITLIST_HOLD: "Reserved for someone on the waitlist",
};

/**
 * Recurring unavailability on a listing. One-off ranges live here too, so an
 * owner blocking a single trip and an owner blocking every Sunday use the same
 * field. Weekdays are 0 = Monday … 6 = Sunday, matching the backend.
 */
export type BlackoutDate = DateRange & { id?: string; reason?: string | null };

/** One card in the browse grid. Deliberately slimmer than `Listing`. */
export type ListingCard = {
  id: string;
  name: string;
  category: ListingCategory;
  /** Raw object key - kept for reference; render primary_photo_url instead. */
  primary_photo_key: string | null;
  /** Public URL for the first photo, or null when the listing has none yet. */
  primary_photo_url: string | null;
  /** Every photo, for the card's carousel - not just the primary one. */
  photo_urls: string[];
  // A listing carries at least one of the two, never neither - see
  // CreateListingRequest below - so a card renders whichever it has.
  price_per_day_cents: number | null;
  price_per_week_cents: number | null;
  deposit_cents: number;
  location_area: LocationArea;
  /** The passport's serial status, for the card's badge (S2-30). */
  serial_status: SerialStatus | null;
};

export type BrowseListingsResponse = {
  results: ListingCard[];
  /** Matches every applied filter, not just the current page. */
  total_count: number;
  page: number;
  page_size: number;
};

/** A listing in full, as returned when one is created. */
export type Listing = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  category: ListingCategory;
  brand: string;
  condition: ListingCondition;
  location_area: LocationArea;
  price_per_day_cents: number | null;
  price_per_week_cents: number | null;
  deposit_cents: number;
  /** S2-09: what the owner says it would cost to replace. Null when undeclared. */
  replacement_value_cents: number | null;
  min_rental_days: number | null;
  max_rental_days: number | null;
  available_from: string;
  available_until: string | null;
  blackout_dates: unknown[];
  attributes: Record<string, unknown>;
  has_custom_availability: boolean;
  custom_available_days: number[] | null;
  photo_keys: string[];
  /** Public URLs, one per entry in photo_keys, in the same order. */
  photo_urls: string[];
  status: ListingStatus;
  /** Set only while status is PENDING_REMOVAL - see S1-12. */
  scheduled_removal_at: string | null;
  created_at: string;
  updated_at: string;
};

export const ALLOWED_PHOTO_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const MAX_LISTING_PHOTOS = 8;

/** What POST /listings/photos/presign returns for one photo. */
/** "passport" photos are condition evidence, stored apart from listing photos. */
export type PhotoKind = "listing" | "passport";

/** S2-04 Scenario 2: the four angles a baseline covers, in capture order. */
export const BASELINE_ANGLES = [
  { key: "front", label: "Front" },
  { key: "back", label: "Back" },
  { key: "high_wear", label: "High-wear area" },
  { key: "underside", label: "Underside" },
] as const;
export type BaselineAngle = (typeof BASELINE_ANGLES)[number]["key"];

/**
 * Reads BaselinePhotosField's hidden `baseline_photos` field. Null unless
 * every angle has a key, so callers can answer with one message rather than
 * sending an incomplete baseline for FastAPI to reject.
 */
export function parseBaselinePhotos(formData: FormData): Record<BaselineAngle, string> | null {
  try {
    const parsed: unknown = JSON.parse(String(formData.get("baseline_photos") ?? ""));
    if (typeof parsed !== "object" || parsed === null) return null;
    const photos = parsed as Record<string, unknown>;
    return BASELINE_ANGLES.every(({ key }) => typeof photos[key] === "string" && photos[key])
      ? (photos as Record<BaselineAngle, string>)
      : null;
  } catch {
    return null;
  }
}

export const BASELINE_INCOMPLETE = "Add a photo for each of the four angles.";

/**
 * VERIFIED: a unique serial. NO_SERIAL: the item has none, so a
 * distinguishing-marks photo identifies it. DUPLICATE: the serial is already
 * on another owner's listing of the same brand, so it's flagged for admins.
 */
export type SerialStatus = "PENDING" | "VERIFIED" | "NO_SERIAL" | "DUPLICATE";

/**
 * S2-30: two tiers. A unique serial earns the stronger one, an item with no
 * serial the weaker. A flagged duplicate earns neither until an admin looks
 * at it (renters are sent it as PENDING anyway, so they can't tell it apart).
 */
export function passportBadge(status: SerialStatus | null | undefined): string | null {
  if (status === "VERIFIED") return "Serial verified";
  if (status === "NO_SERIAL") return "Photo verified";
  return null;
}

export type PassportEntry = {
  id: string;
  /** BASELINE | SERIAL_VERIFICATION | CONDITION_UPDATE now; HANDOVER, RETURN, DAMAGE, RESOLUTION later. */
  entry_type: string;
  created_by: string;
  created_at: string;
  /** Angle (or "serial") -> a URL the browser can show directly. */
  photo_urls: Record<string, string>;
  data: Record<string, unknown>;
};

/** GET /listings/{id}/passport. Non-owners get no serial_number and empty entry data. */
export type Passport = {
  listing_id: string;
  serial_number: string | null;
  serial_status: SerialStatus;
  /** What still blocks publishing, e.g. ["baseline"]; empty once complete. */
  missing: string[];
  /** Newest first. */
  entries: PassportEntry[];
};

/** POST /listings/{id}/passport/serial/extract. readable is false when the owner should retake or type it. */
export type SerialExtraction = {
  serial: string | null;
  confidence: number;
  readable: boolean;
};

/**
 * The serial as the owner confirmed it, with the label photo (a passports/ key)
 * as evidence. With no_serial, the photo is of the item's distinguishing marks
 * instead and there's no serial (S2-32).
 */
export type SerialClaim = {
  photo_key: string;
  no_serial?: boolean;
  serial: string | null;
  /** What extraction suggested, so the passport records whether the owner corrected it. */
  extracted: string | null;
  confidence: number | null;
};

/** Reads SerialField's inputs. Null until there's a photo and either a serial or "no serial". */
export function parseSerialClaim(formData: FormData): SerialClaim | null {
  const photoKey = String(formData.get("serial_photo_key") ?? "");
  if (photoKey && formData.get("no_serial") === "true") {
    return { photo_key: photoKey, no_serial: true, serial: null, extracted: null, confidence: null };
  }
  const serial = String(formData.get("serial") ?? "").trim();
  if (!photoKey || !serial) return null;
  const confidence = String(formData.get("serial_confidence") ?? "");
  return {
    photo_key: photoKey,
    serial,
    extracted: String(formData.get("serial_extracted") ?? "") || null,
    confidence: confidence ? Number(confidence) : null,
  };
}

export const SERIAL_INCOMPLETE =
  "Photograph the serial number label and confirm the serial, or mark the item as having no serial.";

export const PASSPORT_ENTRY_LABELS: Record<string, string> = {
  BASELINE: "Baseline condition",
  // Recorded, not verified: a duplicate is recorded too. The badge says how far it's trusted.
  SERIAL_VERIFICATION: "Serial number recorded",
  CONDITION_UPDATE: "Condition update",
};

/** An entry's heading. An item without a serial records its marks photo under the same entry type. */
export function passportEntryLabel(entry: Pick<PassportEntry, "entry_type" | "data">): string {
  if (entry.entry_type === "SERIAL_VERIFICATION" && entry.data.method === "NO_SERIAL") {
    return "Distinguishing marks recorded";
  }
  return PASSPORT_ENTRY_LABELS[entry.entry_type] ?? entry.entry_type;
}

/** S2-31: up to four photos per condition update. */
export const MAX_CONDITION_UPDATE_PHOTOS = 4;

/** Label for a photo slot name; falls back to the raw name for types added later. */
export const PASSPORT_PHOTO_LABELS: Record<string, string> = {
  ...Object.fromEntries(BASELINE_ANGLES.map(({ key, label }) => [key, label])),
  serial: "Serial number",
  marks: "Distinguishing marks",
  ...Object.fromEntries(
    Array.from({ length: MAX_CONDITION_UPDATE_PHOTOS }, (_, i) => [`photo_${i + 1}`, `Photo ${i + 1}`]),
  ),
};

export type PresignPhotoResponse = {
  upload_url: string;
  photo_key: string;
};

export type CreateListingRequest = {
  name: string;
  description: string;
  brand: string;
  category: ListingCategory;
  condition: ListingCondition;
  location_area: LocationArea;
  deposit_cents: number;
  replacement_value_cents?: number | null;
  /**
   * Price per rental block is a choice, not two mandatory fields: at least
   * one of these two must be set (FastAPI 422s otherwise), but neither is
   * required on its own. Non-negative integer cents.
   */
  price_per_day_cents?: number | null;
  price_per_week_cents?: number | null;
  min_rental_days?: number | null;
  max_rental_days?: number | null;
  /** ISO date (YYYY-MM-DD). Omitting available_until means indefinitely. */
  available_from: string;
  available_until?: string | null;
  has_custom_availability?: boolean;
  custom_available_days?: number[] | null;
  initial_blackouts?: BlackoutDate[];
  /** At least one is required (FastAPI 422s on an empty list). */
  photo_keys: string[];
/** Values validated against the selected category's current schema on create. */
  attributes?: Record<string, unknown>;
  /** The item's identity; its passport is created with it. */
  serial: SerialClaim;
};

export type CategoryAttributeDefinition = {
  id: string;
  category_slug: string;
  attribute_key: string;
  label: string;
  data_type: "text" | "number" | "select";
  is_required: boolean;
  options: string[];
  min_val: number | null;
  max_val: number | null;
  display_order: number;
};

export type ListingCategoryOption = { slug: string; label: string; display_order: number; is_active: boolean };

/**
 * A partial update for PATCH /listings/{id}. Every field is optional and an
 * omitted one is left alone, so a caller sends only what actually changed.
 * The weekly schedule and blackouts are deliberately absent: those have
 * their own endpoints, mirrored by the /listings/[id]/availability page.
 */
export type UpdateListingRequest = Partial<
  Pick<
    CreateListingRequest,
    | "name"
    | "description"
    | "brand"
    | "category"
    | "condition"
    | "location_area"
    | "deposit_cents"
    | "replacement_value_cents"
    | "price_per_day_cents"
    | "price_per_week_cents"
    | "min_rental_days"
    | "max_rental_days"
    | "available_from"
    | "available_until"
    | "photo_keys"
  >
>;

export type UpdateListingResponse = {
  listing: Listing;
  /**
   * Confirmed or in-progress rentals on this listing at the time of the edit.
   * They keep the terms they were booked at; the count is what tells the
   * form whether that is worth saying to the owner (S1-10 Scenario 4).
   */
  active_booking_count: number;
};


export const CATEGORY_LABELS: Record<ListingCategory, string> = {
  PHOTOGRAPHY_VIDEOGRAPHY: "Photography & video",
  CAMPING_OUTDOOR: "Camping & outdoor",
  HIKING: "Hiking",
  POWER_TOOLS_DIY: "Power tools & DIY",
  SPORTS_FITNESS: "Sports & fitness",
  MUSIC_AUDIO: "Music & audio",
  GAMING_TECH: "Gaming & tech",
  EVENTS_PARTY: "Events & party",
  COOKING_BAKING: "Cooking & baking",
  GARDENING: "Gardening",
  OTHER: "Other",
};

export const CONDITION_LABELS: Record<ListingCondition, string> = {
  NEW: "New",
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
};

export const LOCATION_LABELS: Record<LocationArea, string> = {
  ANG_MO_KIO: "Ang Mo Kio",
  BEDOK: "Bedok",
  BISHAN: "Bishan",
  BUKIT_BATOK: "Bukit Batok",
  BUKIT_MERAH: "Bukit Merah",
  BUKIT_PANJANG: "Bukit Panjang",
  BUKIT_TIMAH: "Bukit Timah",
  CHOA_CHU_KANG: "Choa Chu Kang",
  CLEMENTI: "Clementi",
  DOWNTOWN_CORE: "Downtown Core",
  EAST_COAST: "East Coast",
  GEYLANG: "Geylang",
  HOUGANG: "Hougang",
  JURONG_EAST: "Jurong East",
  JURONG_WEST: "Jurong West",
  KALLANG: "Kallang",
  MARINE_PARADE: "Marine Parade",
  NOVENA: "Novena",
  ORCHARD: "Orchard",
  PASIR_RIS: "Pasir Ris",
  PUNGGOL: "Punggol",
  QUEENSTOWN: "Queenstown",
  SEMBAWANG: "Sembawang",
  SENGKANG: "Sengkang",
  SENTOSA: "Sentosa",
  SERANGOON: "Serangoon",
  TAMPINES: "Tampines",
  TIONG_BAHRU: "Tiong Bahru",
  TOA_PAYOH: "Toa Payoh",
  WOODLANDS: "Woodlands",
  YISHUN: "Yishun",
};

/** A row of GET /listings/mine: the listing plus what its passport still lacks (S2-01). */
export type OwnerListing = Listing & {
  /** e.g. ["baseline", "serial"]; empty once the passport is complete. */
  passport_missing: string[];
};

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Published",
  ARCHIVED: "Archived",
  PENDING_REMOVAL: "Removal scheduled",
  REMOVED: "Removed",
};

export const CATEGORIES = Object.keys(CATEGORY_LABELS) as ListingCategory[];
export const CONDITIONS = Object.keys(CONDITION_LABELS) as ListingCondition[];
export const LOCATION_AREAS = Object.keys(LOCATION_LABELS) as LocationArea[];

/** Monday-first, matching the backend's 0 = Monday weekday numbering. */
export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Days a rental covers, both ends inclusive: 3 Oct to 5 Oct is three days, not two. */
export function rentalDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

/**
 * What a rental of `days` costs at a listing's rates, in cents.
 *
 * A listing prices by the day, by the week, or by both, so three rules:
 * one rate alone is simply multiplied (a part-week on a weekly-only listing
 * rounds up, since week granularity is what that owner chose to sell), and a
 * listing carrying both charges whole weeks at the weekly rate with the
 * remainder at the daily rate — capped at one more week, so six leftover days
 * never cost more than a seventh one would.
 *
 * Returns null when the listing has neither rate, which the API forbids but
 * the type permits.
 *
 * NOTE: this is the first place in the project that turns a rental length
 * into money. Nothing on the backend computes a rental fee yet — escrow is
 * handed one — so this rule is a proposal, not a mirror of a server-side
 * one. When the booking/escrow flow starts charging, the two must agree, and
 * this is the definition to reconcile against.
 */
export function rentalSubtotalCents(
  listing: Pick<Listing, "price_per_day_cents" | "price_per_week_cents">,
  days: number,
): number | null {
  return rentalQuote(listing, days)?.totalCents ?? null;
}

/** One line of a rental quote: "2 weeks x $100.00 = $200.00". */
export type RentalQuoteLine = {
  /** How many of the unit, for the "2 weeks" part. */
  count: number;
  unit: "day" | "week";
  rateCents: number;
  amountCents: number;
  /**
   * Set when this line charges a whole week for fewer than seven days,
   * because the daily rate would have cost more. Without saying so, a renter
   * reading "1 week" against a five-day booking would think it a mistake.
   */
  cappedFromDays?: number;
};

export type RentalQuote = { lines: RentalQuoteLine[]; totalCents: number };

/**
 * The same arithmetic as rentalSubtotalCents, itemised.
 *
 * Showing the working is not decoration: a renter who books six days on a
 * listing priced both ways is charged a full week, and a bare total gives
 * them no way to see that it was the cheaper of the two.
 */
export function rentalQuote(
  listing: Pick<Listing, "price_per_day_cents" | "price_per_week_cents">,
  days: number,
): RentalQuote | null {
  const daily = listing.price_per_day_cents;
  const weekly = listing.price_per_week_cents;
  if (days <= 0) return null;

  const lines: RentalQuoteLine[] = [];

  if (daily !== null && weekly !== null) {
    const weeks = Math.floor(days / 7);
    const remainder = days % 7;
    if (weeks > 0) {
      lines.push({ count: weeks, unit: "week", rateCents: weekly, amountCents: weeks * weekly });
    }
    if (remainder > 0) {
      const asDays = remainder * daily;
      lines.push(
        asDays <= weekly
          ? { count: remainder, unit: "day", rateCents: daily, amountCents: asDays }
          : { count: 1, unit: "week", rateCents: weekly, amountCents: weekly, cappedFromDays: remainder },
      );
    }
  } else if (daily !== null) {
    lines.push({ count: days, unit: "day", rateCents: daily, amountCents: days * daily });
  } else if (weekly !== null) {
    const weeks = Math.ceil(days / 7);
    lines.push({
      count: weeks,
      unit: "week",
      rateCents: weekly,
      amountCents: weeks * weekly,
      ...(days % 7 === 0 ? {} : { cappedFromDays: days }),
    });
  } else {
    return null;
  }

  return { lines, totalCents: lines.reduce((sum, line) => sum + line.amountCents, 0) };
}

/**
 * How a listing's rental length limits read to a renter, or null when it
 * accepts any length. S2-08 Scenario 4 asks for the permitted range to be
 * shown, not only enforced.
 */
export function rentalDurationLimits(
  listing: Pick<Listing, "min_rental_days" | "max_rental_days">,
): string | null {
  const { min_rental_days: min, max_rental_days: max } = listing;
  const days = (count: number) => `${count} ${count === 1 ? "day" : "days"}`;
  if (min !== null && max !== null) return min === max ? days(min) : `${min}–${days(max)}`;
  if (min !== null) return `${days(min)} or longer`;
  if (max !== null) return `up to ${days(max)}`;
  return null;
}

export function isCategory(value: string): value is ListingCategory {
  return value in CATEGORY_LABELS;
}

export function isCondition(value: string): value is ListingCondition {
  return value in CONDITION_LABELS;
}

export function isLocationArea(value: string): value is LocationArea {
  return value in LOCATION_LABELS;
}
