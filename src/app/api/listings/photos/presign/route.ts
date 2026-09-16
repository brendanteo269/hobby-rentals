import { NextResponse } from "next/server";
import { ListingApiError, presignListingPhoto } from "@/lib/api/listings";

/**
 * Browser-facing proxy for FastAPI's POST /listings/photos/presign.
 *
 * The photo-upload-field client component can't call presignListingPhoto
 * directly — it's server-only, since it reads the Supabase session via
 * cookies to attach the bearer token. This route runs on the server, does
 * that lookup, and hands back only what the browser needs: the presigned
 * URL and the key it's for.
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
    const presigned = await presignListingPhoto(contentType);
    return NextResponse.json(presigned);
  } catch (caught) {
    if (caught instanceof ListingApiError) {
      return NextResponse.json({ error: caught.message }, { status: caught.status });
    }
    throw caught;
  }
}
