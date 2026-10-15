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
    // Environment/provider errors can contain operational details (including
    // missing credential names). They are useful in server logs, never to a
    // renter trying a postal code.
    console.error("OneMap postal lookup failed", caught);
    return NextResponse.json({ error: "Postal-code lookup is temporarily unavailable. Please try again later." }, { status: 502 });
  }
}
