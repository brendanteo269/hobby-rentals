"use client";

import { Badge, Select } from "@/components/ui";
import { LOCATION_AREAS, LOCATION_LABELS, type LocationArea } from "@/lib/listings";

/**
 * Where this listing gets handed over.
 *
 * Same shape as WeeklyAvailabilityField: default to the profile's answer,
 * offer to override per listing. An owner who stores camera gear at the
 * office and a kayak at home needs the second option; everyone else should
 * not have to repeat themselves on every listing.
 */
export function PickupLocationField({
  profileDefault,
  custom,
  onCustomChange,
  value,
  onValueChange,
  error,
}: {
  profileDefault: LocationArea | null;
  custom: boolean;
  onCustomChange: (custom: boolean) => void;
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
}) {
  const usingDefault = Boolean(profileDefault) && !custom;
  // The default is what actually goes to the server while it's in force,
  // never the (possibly stale) value sitting in the disabled box below.
  const shown = usingDefault ? (profileDefault as string) : value;

  return (
    <div>
      <span className="block text-sm font-medium">
        Collection area
        <span aria-hidden="true" className="text-accent">
          {" "}
          *
        </span>
      </span>

      <input type="hidden" name="location_area" value={shown} />

      {profileDefault && (
        <div className="mt-3 space-y-2">
          <label className="flex flex-wrap items-center gap-2 text-sm">
            <input
              type="radio"
              name="pickup_location_mode"
              className="accent-ink"
              checked={!custom}
              onChange={() => onCustomChange(false)}
            />
            Use my default pickup location
            <Badge>{LOCATION_LABELS[profileDefault]}</Badge>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="pickup_location_mode"
              className="accent-ink"
              checked={custom}
              onChange={() => onCustomChange(true)}
            />
            Choose a different area for this listing
          </label>
        </div>
      )}

      <Select
        aria-label="Collection area"
        required
        className={`mt-3 max-w-xs ${usingDefault ? "opacity-55" : ""}`}
        value={shown}
        disabled={usingDefault}
        onChange={(event) => onValueChange(event.target.value)}
      >
        <option value="" disabled>
          Choose one
        </option>
        {LOCATION_AREAS.map((area) => (
          <option key={area} value={area}>
            {LOCATION_LABELS[area]}
          </option>
        ))}
      </Select>

      <p className="body-copy mt-2">
        {profileDefault
          ? "Saved from your profile. Switch to set a different area just for this listing."
          : "Where renters collect this item. Add a default pickup location to your profile to skip this next time."}
      </p>

      {error && (
        <p role="alert" className="mt-2 text-xs text-accent-dark">
          {error}
        </p>
      )}
    </div>
  );
}
