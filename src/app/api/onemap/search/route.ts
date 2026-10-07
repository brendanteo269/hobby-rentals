import { NextResponse } from "next/server";
import { searchByPostalCode } from "@/lib/api/onemap";

/**
 * Browser-facing proxy for OneMap's address search, scoped to a postal code.
 * searchByPostalCode is server-only (it signs in with a real OneMap account),
 * and the meetup modal that needs it is a client component.
 */
export async function GET(request: Request) {
  const postal = new URL(request.url).searchParams.get("postal")?.trim() ?? "";
  if (!/^\d{6}$/.test(postal)) {
    return NextResponse.json({ error: "A 6-digit postal code is required." }, { status: 400 });
  }

  try {
    const results = await searchByPostalCode(postal);
    return NextResponse.json({ results });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Address lookup failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
