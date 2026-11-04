/**
 * The browser's half of every S3 upload: ask a same-origin route for a
 * presigned URL, then PUT the file straight to S3. The routes exist because
 * presigning needs the Supabase session, which only the server can read.
 *
 * Client-safe: plain fetch, no server-only imports.
 */

import type { PresignPhotoResponse } from "@/lib/listings";

/**
 * Presigns via `presignPath` and PUTs `file`, returning the key it was
 * stored under. `body` is sent alongside the content type, e.g. a photo kind.
 * Throws with a message fit to show the member.
 */
export async function putFileToS3(
  file: File,
  presignPath: string,
  body: Record<string, string> = {},
): Promise<string> {
  const presignRes = await fetch(presignPath, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, content_type: file.type }),
  });
  if (!presignRes.ok) {
    const reply: unknown = await presignRes.json().catch(() => null);
    const message =
      reply !== null && typeof reply === "object" && "error" in reply
        ? String((reply as { error: unknown }).error)
        : "Could not prepare the upload.";
    throw new Error(message);
  }
  const { upload_url, photo_key } = (await presignRes.json()) as PresignPhotoResponse;

  const putRes = await fetch(upload_url, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error(`${file.name} failed to upload. Try again.`);
  }
  return photo_key;
}
