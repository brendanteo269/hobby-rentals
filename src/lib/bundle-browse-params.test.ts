import { describe, expect, it } from "vitest";
import {
  bundleBrowseHref,
  bundleBrowsePageHref,
  hasActiveBundleFilters,
  parseBundleFilters,
  type BundleBrowseFilters,
} from "@/lib/bundle-browse-params";

const EMPTY: BundleBrowseFilters = {
  q: "",
  category: [],
  location_area: [],
  start_date: "",
  end_date: "",
  page: 1,
};

describe("parseBundleFilters", () => {
  it("reads every filter out of the query string", () => {
    expect(
      parseBundleFilters({
        q: " camera ",
        category: ["PHOTOGRAPHY_VIDEOGRAPHY", "MUSIC_AUDIO"],
        location_area: "BISHAN",
        start_date: "2026-11-01",
        end_date: "2026-11-04",
        page: "3",
      }),
    ).toEqual({
      q: "camera",
      category: ["PHOTOGRAPHY_VIDEOGRAPHY", "MUSIC_AUDIO"],
      location_area: ["BISHAN"],
      start_date: "2026-11-01",
      end_date: "2026-11-04",
      page: 3,
    });
  });

  it("drops values this app does not offer, rather than passing them on", () => {
    const filters = parseBundleFilters({ category: "BANANAS", location_area: "ATLANTIS" });
    expect(filters.category).toEqual([]);
    expect(filters.location_area).toEqual([]);
  });

  it("collapses a repeated value, so it cannot render two identical chips", () => {
    // The filter form resubmits applied values as hidden fields, so choosing
    // one that is already applied would otherwise arrive twice.
    expect(parseBundleFilters({ category: ["HIKING", "HIKING"] }).category).toEqual(["HIKING"]);
  });

  it("falls back to page one for a missing or nonsense page", () => {
    expect(parseBundleFilters({}).page).toBe(1);
    expect(parseBundleFilters({ page: "0" }).page).toBe(1);
    expect(parseBundleFilters({ page: "-4" }).page).toBe(1);
    expect(parseBundleFilters({ page: "abc" }).page).toBe(1);
  });
});

describe("hasActiveBundleFilters", () => {
  it("is false for an untouched browse", () => {
    expect(hasActiveBundleFilters(EMPTY)).toBe(false);
  });

  it("is false on page two with nothing filtering", () => {
    // Paging is not a filter: "no results on page 2" is not "bad filters".
    expect(hasActiveBundleFilters({ ...EMPTY, page: 2 })).toBe(false);
  });

  it.each([
    ["a keyword", { q: "camera" }],
    ["a category", { category: ["HIKING" as const] }],
    ["an area", { location_area: ["BISHAN" as const] }],
    ["a start date", { start_date: "2026-11-01" }],
  ])("is true with %s", (_label, change) => {
    expect(hasActiveBundleFilters({ ...EMPTY, ...change })).toBe(true);
  });
});

describe("bundleBrowseHref", () => {
  it("is a clean path when nothing is applied", () => {
    expect(bundleBrowseHref(EMPTY)).toBe("/bundles");
  });

  it("leaves page one out, so two links to the same view compare equal", () => {
    expect(bundleBrowseHref({ ...EMPTY, q: "tent" })).toBe("/bundles?q=tent");
    expect(bundleBrowseHref({ ...EMPTY, q: "tent", page: 1 })).toBe("/bundles?q=tent");
  });

  it("repeats the key for each value of a list filter", () => {
    expect(bundleBrowseHref({ ...EMPTY, category: ["HIKING", "GARDENING"] })).toBe(
      "/bundles?category=HIKING&category=GARDENING",
    );
  });

  it("round-trips through parseBundleFilters", () => {
    const filters: BundleBrowseFilters = {
      q: "camera",
      category: ["PHOTOGRAPHY_VIDEOGRAPHY"],
      location_area: ["BISHAN", "TAMPINES"],
      start_date: "2026-11-01",
      end_date: "2026-11-04",
      page: 2,
    };
    const query = Object.fromEntries(new URLSearchParams(bundleBrowseHref(filters).split("?")[1]));
    // URLSearchParams collapses repeats, so the multi-value filter is checked
    // through the parser's own view of the string instead.
    const search = new URLSearchParams(bundleBrowseHref(filters).split("?")[1]);
    expect(parseBundleFilters({ ...query, location_area: search.getAll("location_area") })).toEqual(
      filters,
    );
  });
});

describe("bundleBrowsePageHref", () => {
  it("keeps the filters and moves only the page", () => {
    expect(bundleBrowsePageHref({ ...EMPTY, q: "tent" }, 3)).toBe("/bundles?q=tent&page=3");
  });
});
