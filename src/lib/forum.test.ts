import { describe, expect, it } from "vitest";
import { sortComments, type ForumComment } from "./forum";

const c = (id: string, score: number, created_at: string, replies: ForumComment[] = []): ForumComment => ({
  id, parent_id: null, depth: 0, author_id: null, author_name: null, author_avatar_url: null,
  body: id, score, my_vote: 0, removed: false, created_at, replies,
});

const thread = [
  c("old-low", 1, "2026-11-01T00:00:00Z", [c("r-old-high", 5, "2026-11-02T00:00:00Z"), c("r-new-low", 0, "2026-11-03T00:00:00Z")]),
  c("mid-high", 9, "2026-11-04T00:00:00Z"),
  c("new-low", 1, "2026-11-05T00:00:00Z"),
];

describe("sortComments", () => {
  it("top: highest score first at every level, ties keep oldest first", () => {
    const out = sortComments(thread, "top");
    expect(out.map((x) => x.id)).toEqual(["mid-high", "old-low", "new-low"]);
    expect(out[1].replies.map((x) => x.id)).toEqual(["r-old-high", "r-new-low"]);
  });

  it("new: newest first at every level", () => {
    const out = sortComments(thread, "new");
    expect(out.map((x) => x.id)).toEqual(["new-low", "mid-high", "old-low"]);
    expect(out[2].replies.map((x) => x.id)).toEqual(["r-new-low", "r-old-high"]);
  });
});
