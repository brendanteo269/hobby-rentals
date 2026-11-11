import { NextResponse } from "next/server";
import { ForumApiError, presignForumPhoto } from "@/lib/api/forum";

/** Browser-facing proxy for POST /forum/photos/presign (S6-11): presigning needs the server-side session. */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const contentType =
    body !== null && typeof body === "object" && "content_type" in body ? String((body as { content_type: unknown }).content_type) : "";
  if (!contentType) return NextResponse.json({ error: "content_type is required." }, { status: 400 });
  try {
    return NextResponse.json(await presignForumPhoto(contentType));
  } catch (caught) {
    if (caught instanceof ForumApiError) return NextResponse.json({ error: caught.message }, { status: caught.status });
    throw caught;
  }
}
