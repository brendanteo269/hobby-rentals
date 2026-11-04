import { describe, expect, it } from "vitest";
import { CENTERED_CROP, cropSourceSide, outputSide } from "@/lib/image-crop";

describe("cropSourceSide", () => {
  it("is the shorter side at no zoom", () => {
    expect(cropSourceSide(4000, 3000, CENTERED_CROP)).toBe(3000);
  });
  it("shrinks as the crop zooms in", () => {
    expect(cropSourceSide(4000, 3000, { x: 0, y: 0, scale: 2 })).toBe(1500);
  });
});

describe("outputSide", () => {
  it("keeps native resolution when uncapped, as listing photos do", () => {
    expect(outputSide(3000)).toBe(3000);
  });
  it("shrinks a large crop to the cap, as a profile photo does", () => {
    expect(outputSide(3000, 512)).toBe(512);
  });
  it("never enlarges a crop smaller than the cap", () => {
    expect(outputSide(300, 512)).toBe(300);
  });
});
