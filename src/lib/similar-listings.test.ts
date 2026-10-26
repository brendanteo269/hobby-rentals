import { describe, expect, it } from "vitest";
import { loadOrEmpty } from "./similar-listings";

describe("loadOrEmpty", () => {
  it("returns the listings when the load works", async () => {
    expect(await loadOrEmpty(async () => [{ id: "a" }])).toEqual([{ id: "a" }]);
  });

  it("returns an empty list when there is nothing to recommend", async () => {
    expect(await loadOrEmpty(async () => [])).toEqual([]);
  });

  it("returns an empty list when the load fails, so the page stays usable", async () => {
    expect(await loadOrEmpty(async () => { throw new Error("backend down"); })).toEqual([]);
  });

  it("lets Next's login redirect through instead of hiding it", async () => {
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/login?reason=expired;307;" });
    await expect(loadOrEmpty(async () => { throw redirect; })).rejects.toBe(redirect);
  });
});
