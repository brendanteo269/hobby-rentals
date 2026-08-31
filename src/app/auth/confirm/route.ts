import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  const next = searchParams.get("next") ?? "/dashboard";

  const supabase = await createClient();

  const failure = (reason: string) =>
    NextResponse.redirect(
      new URL(`/auth-error?reason=${encodeURIComponent(reason)}`, request.url),
    );
  const success = () => NextResponse.redirect(new URL(next, request.url));

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    return error ? failure(error.message) : success();
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error ? failure(error.message) : success();
  }

  return failure("Missing confirmation token");
}
