"use server";

import { revalidatePath } from "next/cache";
import {
  ForumApiError, castForumVote, createForumComment, createForumPost, reportForumContent, searchGearOptions,
} from "@/lib/api/forum";
import type { Created, Flair, ForumReportReason, ForumTargetKind, GearCard, Held } from "@/lib/forum";

/** S6-11: the forum's writes. Refusals come back as { error } so the form can show them in place. */
type Result<T> = T | { error: string };

async function run<T>(action: () => Promise<T>): Promise<Result<T>> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof ForumApiError) return { error: error.message };
    throw error;
  }
}

export async function submitPost(slug: string, input: {
  title: string; body: string; flair: Flair; photo_keys: string[];
  listing_id: string | null; bundle_id: string | null; confirmation_id: string | null;
}): Promise<Result<Created | Held>> {
  const result = await run(() => createForumPost(slug, input));
  if ("status" in result && result.status === "created") revalidatePath(`/community/${slug}`);
  return result;
}

export async function submitComment(postId: string, input: { body: string; parent_id: string | null; confirmation_id: string | null }): Promise<Result<Created | Held>> {
  const result = await run(() => createForumComment(postId, input));
  if ("status" in result && result.status === "created") revalidatePath(`/community/posts/${postId}`);
  return result;
}

export async function vote(kind: ForumTargetKind, id: string, value: -1 | 0 | 1) {
  return run(() => castForumVote(kind, id, value));
}

export async function report(kind: ForumTargetKind, id: string, reason: ForumReportReason, explanation: string) {
  return run(() => reportForumContent(kind, id, reason, explanation.trim() || null));
}

export async function findGear(q: string): Promise<GearCard[]> {
  const result = await run(() => searchGearOptions(q));
  return "error" in result ? [] : result;
}
