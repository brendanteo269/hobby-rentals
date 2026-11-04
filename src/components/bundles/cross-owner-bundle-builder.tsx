"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button, Field, FormError } from "@/components/ui";
import { buildBundle, type BuildBundleState } from "@/app/bundles/build/actions";
import { loadBundleSnapshot, saveBundleSnapshot, type BundleSnapshot } from "@/lib/cross-owner-bundle-session";
import type { KitRebuild } from "@/lib/booking-groups";
import { todayIso } from "@/lib/format";
import { BundleLocationField } from "./bundle-location-field";
import { CrossOwnerBundleEditor } from "./cross-owner-bundle-editor";

/**
 * S5-08 Scenario 1: the renter describes an activity and picks dates, presses
 * "Build my bundle", and gets a set of gear from different owners back in the
 * editor below the form. The model takes several seconds, so the button says
 * what it is doing while it works.
 *
 * Opening one of the listings unmounts all this, so the form, the suggestion
 * and the renter's edits are kept for the session and put back on return.
 *
 * `rebuild` (S5-09 Scenario 3) starts the form from a bundle an owner turned down,
 * and carries the listings to leave out; the renter then builds as usual.
 */
export function CrossOwnerBundleBuilder({ rebuild }: { rebuild?: KitRebuild }) {
  const [state, formAction, pending] = useActionState<BuildBundleState, FormData>(buildBundle, undefined);
  // Restored after hydration, never in an initializer: the first client render
  // must match the server's, which has no storage.
  const [restored, setRestored] = useState<BundleSnapshot | null>(null);
  useEffect(() => {
    // A rebuild starts from the bundle, not from whatever was left in the session.
    if (rebuild) return;
    const frame = requestAnimationFrame(() => setRestored(loadBundleSnapshot()));
    return () => cancelAnimationFrame(frame);
  }, [rebuild]);

  // A bundle built in this visit wins over one remembered from before it.
  const bundle = state?.bundle ?? restored?.bundle;
  const values = state?.values ?? restored?.values ?? (rebuild ? rebuildValues(rebuild) : undefined);
  const errors = state?.fieldErrors ?? {};
  const remember = useCallback(
    (items: BundleSnapshot["items"]) => {
      if (bundle && values) saveBundleSnapshot({ values, bundle, items });
    },
    [bundle, values],
  );
  const today = todayIso();
  const origin =
    values?.origin_lat && values.origin_lng
      ? { lat: Number(values.origin_lat), lng: Number(values.origin_lng) }
      : undefined;

  return (
    <div className="space-y-8">
      <form key={restored ? "restored" : "fresh"} action={formAction} className="card space-y-5 p-5 sm:p-6">
        {rebuild && rebuild.exclude_listing_ids.length > 0 && (
          <>
            <input type="hidden" name="exclude_listing_ids" value={rebuild.exclude_listing_ids.join(",")} />
            <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm">
              Rebuilding your bundle without the {rebuild.exclude_listing_ids.length === 1 ? "item" : "items"} an owner turned
              down. Check the details and press Build.
            </p>
          </>
        )}
        <Field
          label="What are you planning?"
          id="activity"
          name="activity"
          required
          maxLength={300}
          placeholder="e.g. 2-day beach camping for 4"
          defaultValue={values?.activity}
          error={errors.activity}
        />
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="From" id="start_date" name="start_date" type="date" required min={today} defaultValue={values?.start_date} error={errors.start_date} />
          <Field label="Until" id="end_date" name="end_date" type="date" required min={today} defaultValue={values?.end_date} error={errors.end_date} />
          <Field
            label="Group size"
            id="group_size"
            name="group_size"
            type="number"
            min={1}
            max={50}
            placeholder="Optional"
            defaultValue={values?.group_size}
            error={errors.group_size}
          />
        </div>
        <BundleLocationField initial={origin} />
        {Object.keys(errors).length === 0 && <FormError message={state?.error} />}
        <Button type="submit" disabled={pending} className="gap-2">
          <Sparkles className="size-4" aria-hidden="true" />
          {pending ? "Building your bundle…" : "Build my bundle"}
        </Button>
        {pending && (
          <p className="body-copy" role="status">
            Working out what you need and checking it is free for your dates. This can take up to a minute.
          </p>
        )}
      </form>

      {bundle && (
        <CrossOwnerBundleEditor
          key={state?.builtAt ?? "restored"}
          bundle={bundle}
          origin={origin}
          initialItems={state?.bundle ? undefined : restored?.items}
          onItemsChange={remember}
        />
      )}
    </div>
  );
}

/** The form's values for a bundle being rebuilt: what the renter asked for the first time. */
function rebuildValues(rebuild: KitRebuild): NonNullable<BuildBundleState>["values"] {
  return {
    activity: rebuild.activity ?? "",
    start_date: rebuild.start_date,
    end_date: rebuild.end_date,
    group_size: rebuild.group_size ? String(rebuild.group_size) : "",
    origin_lat: rebuild.origin_lat === null ? "" : String(rebuild.origin_lat),
    origin_lng: rebuild.origin_lng === null ? "" : String(rebuild.origin_lng),
    exclude_listing_ids: rebuild.exclude_listing_ids.join(","),
  };
}
