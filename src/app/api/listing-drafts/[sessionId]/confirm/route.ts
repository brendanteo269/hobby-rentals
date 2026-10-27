import { NextResponse } from "next/server";
import { ListingApiError, confirmListingDraftPhoto } from "@/lib/api/listings";
export async function POST(_: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try { return NextResponse.json(await confirmListingDraftPhoto((await params).sessionId)); }
  catch (caught) { if (caught instanceof ListingApiError) return NextResponse.json({ error: caught.message }, { status: caught.status }); throw caught; }
}
