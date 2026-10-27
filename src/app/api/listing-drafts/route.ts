import { NextResponse } from "next/server";
import { ListingApiError, startListingDraftPhoto } from "@/lib/api/listings";
export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { content_type?: unknown; replaces_session_id?: unknown } | null;
  try { return NextResponse.json(await startListingDraftPhoto(String(body?.content_type ?? ""), typeof body?.replaces_session_id === "string" ? body.replaces_session_id : undefined), { status: 201 }); }
  catch (caught) { if (caught instanceof ListingApiError) return NextResponse.json({ error: caught.message }, { status: caught.status }); throw caught; }
}
