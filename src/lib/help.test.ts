import { describe, expect, it } from "vitest";
import { HELP_SECTIONS, HELP_TOPICS, helpPath, percent, sectionText } from "@/lib/help";

describe("help content", () => {
  it("gives every topic and section a unique, URL-safe anchor", () => {
    const anchors = [...HELP_TOPICS.map((topic) => topic.id), ...HELP_SECTIONS.map((section) => section.slug), "contact-support"];
    expect(new Set(anchors).size).toBe(anchors.length);
    for (const anchor of anchors) expect(anchor).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("leaves no section empty", () => {
    for (const section of HELP_SECTIONS) expect(sectionText(section).trim()).not.toBe("");
  });

  it("states the figures from the policy constants", () => {
    const text = HELP_SECTIONS.map(sectionText).join("\n");
    expect(text).toContain("A platform fee of 10% of the rental price.");
    expect(text).toContain("Cost: 5% of the rental price, at least $3.00.");
    expect(text).toContain("7 or more days before the start: everything back.");
    expect(text).toContain("2 to 7 days before the start: 50% back.");
    expect(text).not.toMatch(/undefined|NaN/);
  });
});

describe("sectionText", () => {
  it("puts paragraphs and list items one per line", () => {
    expect(sectionText({ slug: "s", title: "T", body: ["Intro.", { list: ["One", "Two"] }] })).toBe("Intro.\n- One\n- Two");
  });
});

describe("helpPath", () => {
  it("links to the page or one of its sections", () => {
    expect(helpPath()).toBe("/help");
    expect(helpPath("deposit-hold")).toBe("/help#deposit-hold");
  });
});

describe("percent", () => {
  it("formats basis points", () => {
    expect(percent(350)).toBe("3.5%");
    expect(percent(1_000)).toBe("10%");
  });
});
