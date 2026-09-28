import { describe, expect, it } from "vitest";
import { parseBaselinePhotos } from "@/lib/listings";

const form = (value: string) => {
  const data = new FormData();
  data.set("baseline_photos", value);
  return data;
};
const all = { front: "a", back: "b", high_wear: "c", underside: "d" };

describe("parseBaselinePhotos", () => {
  it("accepts all four angles", () => {
    expect(parseBaselinePhotos(form(JSON.stringify(all)))).toEqual(all);
  });
  it("rejects a missing or blank angle", () => {
    expect(parseBaselinePhotos(form(JSON.stringify({ ...all, underside: undefined })))).toBeNull();
    expect(parseBaselinePhotos(form(JSON.stringify({ ...all, back: "" })))).toBeNull();
  });
  it("rejects a malformed or absent field", () => {
    expect(parseBaselinePhotos(form("not json"))).toBeNull();
    expect(parseBaselinePhotos(new FormData())).toBeNull();
  });
});
