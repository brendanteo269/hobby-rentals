/**
 * Keeps a cross-owner bundle across a visit to one of its listings.
 *
 * The builder holds the suggestion in component state, which is gone once the
 * renter opens a listing and comes back. Rebuilding costs a model call and
 * would throw away their edits (S5-08 Scenario 4), so the form, the
 * suggestion and the edited items are kept for the tab's session. Session
 * storage rather than local: a bundle is priced for particular dates and
 * should not greet the renter days later on another visit.
 */

import type { BuildBundleValues } from "@/app/bundles/build/actions";
import type { CrossOwnerBundle, EditableItem } from "@/lib/cross-owner-bundles";

const KEY = "hobby-rentals:cross-owner-bundle";

/** Everything needed to show the builder as the renter left it. */
export type BundleSnapshot = {
  values: BuildBundleValues;
  bundle: CrossOwnerBundle;
  items: EditableItem[];
};

/** Remembers the snapshot. Storage is optional, so a failure just means the bundle is not kept. */
export function saveBundleSnapshot(snapshot: BundleSnapshot): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    // Private windows and blocked storage throw; the builder works without it.
  }
}

/** The remembered snapshot, or null if there is none or it is not one this code wrote. */
export function loadBundleSnapshot(): BundleSnapshot | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as Partial<BundleSnapshot> | null;
    if (!saved || typeof saved.values !== "object" || !saved.bundle || !Array.isArray(saved.items)) return null;
    return saved as BundleSnapshot;
  } catch {
    return null;
  }
}

/** Forgets the snapshot, once the bundle has been requested: it is no longer a draft to come back to. */
export function clearBundleSnapshot(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to forget where storage is blocked.
  }
}
