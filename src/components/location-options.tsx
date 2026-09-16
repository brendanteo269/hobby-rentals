import { LOCATION_AREAS, LOCATION_LABELS } from "@/lib/listings";

/**
 * The options for any location picker — the area list and the placeholder,
 * written once.
 *
 * Composed into a `SelectField` as children rather than wrapped around one, so
 * each caller keeps its own label, hint and disabled state visible at the call
 * site. Three forms ask this question and they must offer the same answers.
 */
export function LocationOptions() {
  return (
    <>
      <option value="" disabled>
        Choose one
      </option>
      {LOCATION_AREAS.map((area) => (
        <option key={area} value={area}>
          {LOCATION_LABELS[area]}
        </option>
      ))}
    </>
  );
}
