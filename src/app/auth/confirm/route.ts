import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authErrorPath, loginPath, type AuthErrorCode } from "@/lib/routes";
import { returnsToLogin } from "@/lib/verified-routes";

/**
 * Landing point for the link in the verification email.
 *
 * Handles both shapes Supabase can send:
 *  - `token_hash` + `type`, from a template using {{ .TokenHash }}. Works on
 *    any device, because it carries no PKCE verifier.
 *  - `code`, from the default {{ .ConfirmationURL }} template. Only works in
 *    the browser that started signup, which holds the PKCE verifier cookie.
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/profile";

  const supabase = await createClient();

  /**
   * Sends the member to the error screen with a code, never with the message
   * Supabase produced.
   *
   * The old form reflected `error.message` through the query string and back
   * onto the page. That let a crafted link put arbitrary text on a HobbyRentals
   * page — "your account was suspended, call this number" — which is the same
   * reflection the login notice allowlist exists to prevent. The real message
   * is logged instead, where it is useful and cannot be forged.
   */
  const failure = (code: AuthErrorCode, detail?: string) => {
    if (detail) console.error("Email confirmation failed:", detail);
    return NextResponse.redirect(new URL(authErrorPath(code), request.url));
  };

  /**
   * A confirmation link always establishes a session, whichever shape it took.
   * For a signup that session has to be discarded before the redirect, or the
   * member arrives at the login page already logged in and the screen they are
   * sent to makes no sense.
   *
   * `code` links carry no `type`, and the only code links this app sends are
   * signup confirmations, so an absent type is treated as one.
   */
  const success = async () => {
    if (returnsToLogin(type)) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL(loginPath("verified"), request.url));
    }
    return NextResponse.redirect(new URL(next, request.url));
  };

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    return error ? failure("link-invalid", error.message) : success();
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error ? failure("link-invalid", error.message) : success();
  }

  return failure("link-missing");
}
