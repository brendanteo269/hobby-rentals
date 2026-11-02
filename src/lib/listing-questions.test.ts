import { describe, expect, it } from "vitest";
import { sourceList } from "@/lib/listing-questions";

describe("sourceList", () => {
  const source = (label: string) => ({ id: label.toLowerCase(), label });

  it("names one, two or more sources as a sentence would", () => {
    expect(sourceList([])).toBe("");
    expect(sourceList([source("Description")])).toBe("Description");
    expect(sourceList([source("Description"), source("Reviews")])).toBe("Description and Reviews");
    expect(sourceList([source("Description"), source("Specifications"), source("Reviews")])).toBe("Description, Specifications and Reviews");
  });
});
