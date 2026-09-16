import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeEmailLink } from "@/lib/auth-callback";
import { markRecoverySession } from "@/lib/recovery";
import { RESET_PASSWORD_PATH, authErrorPath } from "@/lib/routes";

/**
 * Landing point for the link in a password-reset email (S1-17).
 *
 * Separate from /auth/confirm because the two want opposite things from the
 * session the link establishes: a signup discards it and sends the member to
 * log in, while a reset has to keep it — that session is the only proof the
 * member holds that they are entitled to set a new password.
 *
 * Keeping them apart is also what makes the recovery mark safe to grant. It is
 * issued here and nowhere else, so it follows from the route the link arrived
 * at rather than from anything the URL could claim about itself.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const supabase = await createClient();

  const result = await exchangeEmailLink(supabase, searchParams, ["recovery"]);

  if (!result.ok) {
    // S1-17 AC4: a dead reset link needs the offer of a new one, not the
    // signup advice the generic confirmation failure gives.
    console.error("Password reset link failed:", result.detail);
    return NextResponse.redirect(new URL(authErrorPath("reset-link-invalid"), request.url));
  }

  // Bound to the account the link was for. Without that the mark says only
  // "this browser opened a reset link", which stays true after signing in as
  // somebody else.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.error("Password reset link verified but left no session");
    return NextResponse.redirect(new URL(authErrorPath("reset-link-invalid"), request.url));
  }

  await markRecoverySession(user.id);

  return NextResponse.redirect(new URL(RESET_PASSWORD_PATH, request.url));
}
