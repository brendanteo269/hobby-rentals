"use server";

import type { FieldErrors } from "@/lib/api/client";
import { buildCrossOwnerBundle, CrossOwnerBundleApiError, searchCrossOwnerBundleListings } from "@/lib/api/cross-owner-bundles";
import type { CrossOwnerBundle, CrossOwnerBundleListing } from "@/lib/cross-owner-bundles";

/** What the form had in it, handed back so a failed build does not clear what the renter typed. */
export type BuildBundleValues = {
  activity: string;
  start_date: string;
  end_date: string;
  group_size: string;
  origin_lat: string;
  origin_lng: string;
  /** Comma-separated listing ids to leave out: set only when rebuilding a kit (S5-09). */
  exclude_listing_ids: string;
};

export type BuildBundleState =
  | { values: BuildBundleValues; error?: string; fieldErrors?: FieldErrors; bundle?: CrossOwnerBundle; builtAt?: number }
  | undefined;

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

/** Optional numbers are left out of the request rather than sent as NaN. */
function optionalNumber(raw: string): number | undefined {
  const value = Number(raw);
  return raw !== "" && Number.isFinite(value) ? value : undefined;
}

/**
 * S5-08 Scenario 1: "Build my bundle". The bundle comes back in the state,
 * where the editor takes over; `builtAt` is what tells it a new one has arrived.
 */
export async function buildBundle(_previous: BuildBundleState, formData: FormData): Promise<BuildBundleState> {
  const values: BuildBundleValues = {
    activity: text(formData, "activity"),
    start_date: text(formData, "start_date"),
    end_date: text(formData, "end_date"),
    group_size: text(formData, "group_size"),
    origin_lat: text(formData, "origin_lat"),
    origin_lng: text(formData, "origin_lng"),
    exclude_listing_ids: text(formData, "exclude_listing_ids"),
  };
  try {
    const bundle = await buildCrossOwnerBundle({
      activity: values.activity,
      start_date: values.start_date,
      end_date: values.end_date,
      group_size: optionalNumber(values.group_size),
      origin_lat: optionalNumber(values.origin_lat),
      origin_lng: optionalNumber(values.origin_lng),
      exclude_listing_ids: values.exclude_listing_ids ? values.exclude_listing_ids.split(",") : undefined,
    });
    return { values, bundle, builtAt: Date.now() };
  } catch (error) {
    if (error instanceof CrossOwnerBundleApiError) return { values, error: error.message, fieldErrors: error.fieldErrors };
    throw error;
  }
}

export type CandidateSearchResult = { error: string } | { listings: CrossOwnerBundleListing[] };

/** S5-08 Scenario 4: listings the renter can add by hand for a search phrase, free for the bundle's dates. */
export async function searchListingsToAdd(params: {
  q: string;
  start_date: string;
  end_date: string;
  origin_lat?: number;
  origin_lng?: number;
}): Promise<CandidateSearchResult> {
  try {
    return { listings: await searchCrossOwnerBundleListings(params) };
  } catch (error) {
    if (error instanceof CrossOwnerBundleApiError) return { error: error.message };
    throw error;
  }
}
