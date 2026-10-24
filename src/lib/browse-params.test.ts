import { describe, expect, it } from "vitest";
import { browseHref, parseBrowseFilters } from "@/lib/browse-params";

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
