import { Field, SelectField } from "@/components/ui";
import { formatMoney } from "@/lib/format";

/** What the owner has set for one chosen item of a bundle (S5-10). Strings, as the inputs hold them. */
export type ItemSettingState = { optional: boolean; deduction: string; alternative: string };

export const REQUIRED_ITEM: ItemSettingState = { optional: false, deduction: "", alternative: "" };

/** A listing the owner could name as a backup. */
export type BackupChoice = { id: string; name: string; price_per_day_cents: number | null };

/**
 * The settings under a chosen item of the bundle form (S5-10): make it optional
 * for a renter, with what that takes off each day (Scenario 1), or pick another of
 * the owner's listings as its backup (Scenario 2). The two are alternatives: an
 * optional item can simply be left out, so it has no backup.
 *
 * Field names are `optional_<id>`, `deduction_<id>` and `alternative_<id>`, which
 * the form's action reads back (parseItemSettings).
 */
export function BundleItemSettings({
  listingId,
  value,
  backups,
  errors,
  onChange,
}: {
  listingId: string;
  value: ItemSettingState;
  /** Listings that may be this item's backup: the owner's others, not already in the bundle or another item's backup. */
  backups: BackupChoice[];
  errors: Record<string, string>;
  onChange: (change: Partial<ItemSettingState>) => void;
}) {
  return (
    <div className="mt-2 grid gap-3 rounded-lg bg-surface-muted p-3 sm:grid-cols-2 sm:items-start">
      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          name={`optional_${listingId}`}
          checked={value.optional}
          onChange={(event) => onChange({ optional: event.target.checked, alternative: "" })}
          className="size-4 accent-ink"
        />
        Optional: renters can leave it out
      </label>

      {value.optional ? (
        <Field
          label="Takes off per day (S$)"
          id={`deduction_${listingId}`}
          name={`deduction_${listingId}`}
          type="number"
          min="0.01"
          step="0.01"
          inputMode="decimal"
          value={value.deduction}
          onChange={(event) => onChange({ deduction: event.target.value })}
          error={errors[`deduction_${listingId}`]}
        />
      ) : (
        <SelectField
          label="Backup item"
          hint="Booked instead when this one is not free for the renter's dates."
          id={`alternative_${listingId}`}
          name={`alternative_${listingId}`}
          value={value.alternative}
          onChange={(event) => onChange({ alternative: event.target.value })}
        >
          <option value="">None</option>
          {backups.map((backup) => (
            <option key={backup.id} value={backup.id}>
              {backup.name}
              {backup.price_per_day_cents !== null && ` · ${formatMoney(backup.price_per_day_cents)} / day`}
            </option>
          ))}
        </SelectField>
      )}
    </div>
  );
}
