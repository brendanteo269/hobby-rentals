import "server-only";

import { unstable_rethrow } from "next/navigation";
import { backendRequest } from "@/lib/api/client";
import type { PresignPhotoResponse } from "@/lib/listings";

/**
 * The signed-in member's own photo URL, or null - including when the backend
 * cannot be reached. The header shows it on every page, so an outage must
 * cost the photo (the initial shows instead), never the page.
 */
export async function getOwnAvatarUrl(): Promise<string | null> {
  try {
    const { avatar_url } = await backendRequest<{ avatar_url: string | null }>("/profile/avatar");
    return avatar_url;
  } catch (error) {
    // A redirect (the session ended) is Next's control flow, not a failure.
    unstable_rethrow(error);
    console.error("Own profile photo lookup failed:", error);
    return null;
  }
}

/** A one-time URL for the cropped photo, under the member's private upload prefix. */
export function presignAvatarUpload(content_type: string) {
  return backendRequest<PresignPhotoResponse>("/profile/avatar/presign", {
    method: "POST",
    body: JSON.stringify({ content_type }),
  });
}

/**
 * Makes an upload the member's profile photo. The backend checks and
 * re-encodes it, and deletes the photo it replaces; a 422 carries the reason
 * it was refused, written for the member.
 */
export function saveAvatar(upload_key: string) {
  return backendRequest<{ avatar_url: string }>("/profile/avatar", {
    method: "PUT",
    body: JSON.stringify({ upload_key }),
  });
}

export function removeAvatar() {
  return backendRequest<void>("/profile/avatar", { method: "DELETE" });
}
