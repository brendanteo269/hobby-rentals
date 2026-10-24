import { describe, expect, it } from "vitest";
import { parseBrowseFilters } from "@/lib/browse-params";
import { marketplaceHref } from "@/lib/marketplace";

describe("marketplaceHref", () => {
  it("carries the shared filters across and drops the ones bundles lack", () => {
    const items = parseBrowseFilters({ q: "tent", category: "CAMPING_OUTDOOR", condition: "NEW", brand: "MSR", page: "3" });
    expect(marketplaceHref("bundles", items)).toBe("/bundles?q=tent&category=CAMPING_OUTDOOR");
  });

  it("goes back to the items side from page one", () => {
    expect(marketplaceHref("items", { q: "", category: [], location_area: [], start_date: "2026-11-01", end_date: "2026-11-03" })).toBe(
      "/browse?start_date=2026-11-01&end_date=2026-11-03",
    );
  });
});
