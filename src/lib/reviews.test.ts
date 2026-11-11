import { describe, expect, it } from "vitest";
import { reviewSummaryLabel } from "./reviews";

describe("reviewSummaryLabel", () => {
  it("names how many reviews the summary was made from", () => {
    expect(reviewSummaryLabel({ review_count: 5 })).toBe("AI summary of 5 reviews");
    expect(reviewSummaryLabel({ review_count: 3 })).toBe("AI summary of 3 reviews");
  });

  it("is singular for one", () => {
    expect(reviewSummaryLabel({ review_count: 1 })).toBe("AI summary of 1 review");
  });
});
