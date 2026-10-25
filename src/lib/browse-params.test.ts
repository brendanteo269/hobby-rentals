import { describe, expect, it } from "vitest";
import {
  RELAX_FILTER_LABELS,
  browseHref,
  parseBrowseFilters,
  relatedCategoryHref,
  relaxedHref,
} from "@/lib/browse-params";

describe("radius browse parameters", () => {
  it("accepts a complete radius origin and makes it mutually exclusive with area", () => {
    const filters = parseBrowseFilters({
      location_area: "BISHAN",
      origin_lat: "1.3521",
      origin_lng: "103.8198",
      radius_km: "5",
      sort: "nearest",
    });
    expect(filters.location_area).toEqual([]);
    expect(filters).toMatchObject({ origin_lat: 1.3521, origin_lng: 103.8198, radius_km: 5, sort: "nearest" });
    expect(browseHref(filters)).toContain("sort=nearest");
  });

  it("drops an incomplete or invalid origin rather than sending it to the API", () => {
    expect(parseBrowseFilters({ origin_lat: "1.3", radius_km: "5" })).toMatchObject({
      origin_lat: null,
      origin_lng: null,
      radius_km: null,
      sort: "newest",
    });
  });
});

describe("daily price browse parameters", () => {
  it("keeps valid daily price bounds in the URL and drops invalid ones", () => {
    const filters = parseBrowseFilters({ min_price: "12.50", max_price: "40" });
    expect(filters).toMatchObject({ min_price: "12.5", max_price: "40" });
    expect(browseHref(filters)).toContain("min_price=12.5");
    expect(parseBrowseFilters({ min_price: "-1", max_price: "nope" })).toMatchObject({ min_price: "", max_price: "" });
  });
});

describe("semantic search parameters", () => {
  it("sorts by relevance by default once there is a query, and by newest without one", () => {
    expect(parseBrowseFilters({ q: "camping in the rain" }).sort).toBe("relevance");
    expect(parseBrowseFilters({}).sort).toBe("newest");
    // Relevance means nothing without a query.
    expect(parseBrowseFilters({ sort: "relevance" }).sort).toBe("newest");
    expect(parseBrowseFilters({ q: "tent", sort: "newest" }).sort).toBe("newest");
  });

  it("writes only a sort other than the default", () => {
    const search = parseBrowseFilters({ q: "tent" });
    expect(browseHref(search)).toBe("/browse?q=tent");
    expect(browseHref({ ...search, sort: "newest" })).toBe("/browse?q=tent&sort=newest");
    expect(browseHref({ ...parseBrowseFilters({}), sort: "relevance" })).toBe("/browse");
    // Nearest without a location falls back too.
    expect(browseHref({ ...search, sort: "nearest" })).toBe("/browse?q=tent");
  });
});

describe("no-results suggestions", () => {
  const filters = parseBrowseFilters({
    q: "industrial excavator",
    category: "POWER_TOOLS_DIY",
    max_price: "20",
    start_date: "2026-11-10",
    end_date: "2026-11-12",
    origin_lat: "1.35",
    origin_lng: "103.8",
    radius_km: "5",
    sort: "nearest",
  });

  it("removes only the filter suggested, keeping the search", () => {
    expect(relaxedHref(filters, "price")).not.toContain("max_price");
    expect(relaxedHref(filters, "price")).toContain("q=industrial+excavator");
    expect(relaxedHref(filters, "price")).toContain("category=POWER_TOOLS_DIY");
    expect(relaxedHref(filters, "dates")).not.toContain("start_date");
    expect(relaxedHref(filters, "category")).not.toContain("category=");
  });

  it("drops nearest with the location it needed", () => {
    const href = relaxedHref(filters, "radius");
    expect(href).not.toContain("origin_lat");
    expect(href).not.toContain("sort=");
  });

  it("labels every filter the backend may suggest", () => {
    for (const filter of ["category", "condition", "brand", "location_area", "price", "dates", "radius", "verified_only"] as const) {
      expect(RELAX_FILTER_LABELS[filter]).toBeTruthy();
    }
  });

  it("links a related category on its own", () => {
    expect(relatedCategoryHref("POWER_TOOLS_DIY")).toBe("/browse?category=POWER_TOOLS_DIY");
    expect(relatedCategoryHref("BANANAS")).toBe("/browse");
  });
});
