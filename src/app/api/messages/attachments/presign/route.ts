import { NextResponse } from "next/server";
import { ConversationApiError, presignMessageAttachment } from "@/lib/api/conversations";

/**
 * Browser-facing proxy for FastAPI's POST /messages/attachments/presign.
 *
 * Same reason as /api/listings/photos/presign: presignMessageAttachment is
 * server-only (it reads the Supabase session via cookies), and the composer
 * that owns the picked file is a client component.
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
    const presigned = await presignMessageAttachment(contentType);
    return NextResponse.json(presigned);
  } catch (caught) {
    if (caught instanceof ConversationApiError) {
      return NextResponse.json({ error: caught.message }, { status: caught.status });
    }
    throw caught;
  }
}
