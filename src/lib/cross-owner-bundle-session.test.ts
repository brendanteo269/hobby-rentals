import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearBundleSnapshot, loadBundleSnapshot, saveBundleSnapshot, type BundleSnapshot } from "@/lib/cross-owner-bundle-session";

const snapshot = {
  values: { activity: "beach camping", start_date: "2026-12-01", end_date: "2026-12-02", group_size: "4", origin_lat: "", origin_lng: "" },
  bundle: { activity: "beach camping", items: [] },
  items: [{ id: "tent" }],
} as unknown as BundleSnapshot;

function stubStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  });
  return data;
}

describe("bundle snapshot", () => {
  beforeEach(() => stubStorage());
  afterEach(() => vi.unstubAllGlobals());

  it("comes back as it was saved, edits included", () => {
    saveBundleSnapshot(snapshot);
    expect(loadBundleSnapshot()).toEqual(snapshot);
  });

  it("is null when nothing was saved", () => {
    expect(loadBundleSnapshot()).toBeNull();
  });

  it("is null when what is stored is not a snapshot", () => {
    for (const junk of ["not json", "{}", JSON.stringify({ values: {}, bundle: {}, items: "no" })]) {
      stubStorage({ "hobby-rentals:cross-owner-bundle": junk });
      expect(loadBundleSnapshot()).toBeNull();
    }
  });

  it("does not throw when storage is blocked", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
    });
    expect(() => saveBundleSnapshot(snapshot)).not.toThrow();
    expect(loadBundleSnapshot()).toBeNull();
  });
});

describe("clearing the snapshot", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("forgets it, so a requested kit is not offered for checkout again", () => {
    const data = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
    });
    saveBundleSnapshot(snapshot);
    clearBundleSnapshot();
    expect(loadBundleSnapshot()).toBeNull();
  });

  it("does not throw where storage is blocked", () => {
    vi.stubGlobal("sessionStorage", { removeItem: () => { throw new Error("blocked"); } });
    expect(() => clearBundleSnapshot()).not.toThrow();
  });
});
