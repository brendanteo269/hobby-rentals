import { NextResponse } from "next/server";
import { BackendApiError } from "@/lib/api/client";
import { presignAvatarUpload } from "@/lib/api/profile-avatar";

/**
 * Browser-facing proxy for FastAPI's POST /profile/avatar/presign, for the
 * same reason as /api/listings/photos/presign: presigning reads the Supabase
 * session, which only the server can. A route of its own rather than a kind
 * on that one, because that backend endpoint requires a confirmed email and
 * onboarding - where a photo can first be added - does not.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const contentType =
    body !== null && typeof body === "object" && "content_type" in body
      ? String((body as { content_type: unknown }).content_type)
      : "";

  if (!contentType) {
    return NextResponse.json({ error: "content_type is required." }, { status: 400 });
  }

  try {
    return NextResponse.json(await presignAvatarUpload(contentType));
  } catch (caught) {
    if (caught instanceof BackendApiError) {
      return NextResponse.json({ error: caught.message }, { status: caught.status });
    }
    throw caught;
  }
}
