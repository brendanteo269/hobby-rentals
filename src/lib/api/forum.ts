import "server-only";

import { backendRequest } from "@/lib/api/client";
import type {
  Created, Flair, ForumReportReason, ForumSort, ForumSummary, ForumTargetKind, GearCard, Held, PostDetail, PostPage,
} from "@/lib/forum";

export { BackendApiError as ForumApiError } from "@/lib/api/client";

/** Mirrors app/routers/forum.py (S6-11). */
export function getForums() {
  return backendRequest<ForumSummary[]>("/forum/categories");
}

export function getForumPosts(slug: string, sort: ForumSort, flair: Flair | null, page: number) {
  const query = new URLSearchParams({ sort, page: String(page) });
  if (flair) query.set("flair", flair);
  return backendRequest<PostPage>(`/forum/c/${encodeURIComponent(slug)}/posts?${query}`);
}

export function getForumPost(postId: string) {
  return backendRequest<PostDetail>(`/forum/posts/${encodeURIComponent(postId)}`);
}

export function searchGearOptions(q: string) {
  return backendRequest<GearCard[]>(`/forum/gear-options?q=${encodeURIComponent(q)}`);
}

export function presignForumPhoto(content_type: string) {
  return backendRequest<{ upload_url: string; photo_key: string }>("/forum/photos/presign", {
    method: "POST",
    body: JSON.stringify({ content_type }),
  });
}

export function createForumPost(slug: string, body: {
  title: string; body: string; flair: Flair; photo_keys: string[];
  listing_id: string | null; bundle_id: string | null; confirmation_id: string | null;
}) {
  return backendRequest<Created | Held>(`/forum/c/${encodeURIComponent(slug)}/posts`, { method: "POST", body: JSON.stringify(body) });
}

export function createForumComment(postId: string, body: { body: string; parent_id: string | null; confirmation_id: string | null }) {
  return backendRequest<Created | Held>(`/forum/posts/${encodeURIComponent(postId)}/comments`, { method: "POST", body: JSON.stringify(body) });
}

export function castForumVote(target_kind: ForumTargetKind, target_id: string, value: -1 | 0 | 1) {
  return backendRequest<{ score: number; my_vote: number }>("/forum/vote", {
    method: "POST",
    body: JSON.stringify({ target_kind, target_id, value }),
  });
}

export function reportForumContent(target_kind: ForumTargetKind, target_id: string, reason: ForumReportReason, explanation: string | null) {
  return backendRequest<{ id: string }>("/forum/reports", {
    method: "POST",
    body: JSON.stringify({ target_kind, target_id, reason, explanation }),
  });
}
