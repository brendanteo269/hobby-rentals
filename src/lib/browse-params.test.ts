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
