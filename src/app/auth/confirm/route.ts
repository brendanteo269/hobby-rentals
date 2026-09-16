import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeEmailLink } from "@/lib/auth-callback";
import { authErrorPath, loginPath } from "@/lib/routes";

/**
 * Landing point for the link in a signup or email-change confirmation.
 *
 * Password resets land on /auth/recover instead, and the split is the point: a
 * `code` link carries no `type`, so nothing in the query string can say what a
 * link was for. Inferring it from `next` would decide a security question —
 * whether this session may set a password without knowing the old one — from a
 * value the URL controls. The route is the discriminator instead.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const supabase = await createClient();

  const result = await exchangeEmailLink(supabase, searchParams, ["signup", "email"]);

  if (!result.ok) {
    // Logged rather than reflected: an earlier version echoed this through the
    // query string and back onto the page, which let a crafted link put
    // arbitrary text on a HobbyRentals page.
    console.error("Email confirmation failed:", result.detail);
    return NextResponse.redirect(new URL(authErrorPath("link-invalid"), request.url));
  }

  // Verifying established a session, and for a signup that session has to go:
  // S1-01 AC2 sends the member to the login screen, and arriving there already
  // logged in makes no sense. The link may well have been opened on a
  // different device from the one they will actually use.
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL(loginPath("verified"), request.url));
}
