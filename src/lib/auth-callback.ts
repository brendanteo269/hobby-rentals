import "server-only";

import type { EmailOtpType, SupabaseClient } from "@supabase/supabase-js";

/**
 * Turns whichever shape of email link Supabase sent into a session.
 *
 * Handles both:
 *  - `token_hash` + `type`, from a template using {{ .TokenHash }}. Works on
 *    any device, because it carries no PKCE verifier.
 *  - `code`, from the default {{ .ConfirmationURL }} template. Only works in
 *    the browser that started the flow, which holds the PKCE verifier cookie.
 *
 * What the link was *for* is deliberately not decided here. A `code` link
 * carries no `type` at all, so the query string cannot answer it — which is
 * why each kind of link has its own callback route, and the route it arrived
 * at is what says whether this was a signup or a password reset.
 */
export type CallbackResult = { ok: true } | { ok: false; detail: string };

export async function exchangeEmailLink(
  supabase: SupabaseClient,
  params: URLSearchParams,
  /** Used for a token_hash link that did not name its own type. */
  fallbackType: EmailOtpType,
): Promise<CallbackResult> {
  // A link Supabase has already rejected comes back carrying its reason and no
  // token at all — an expired or reused one, most often. Reading it here is
  // what keeps the log saying "Email link is invalid or has expired" rather
  // than the misleading "carried no token" the checks below would conclude.
  const suppliedError = params.get("error_description") ?? params.get("error");
  if (suppliedError) return { ok: false, detail: suppliedError };

  const tokenHash = params.get("token_hash");
  const type = (params.get("type") as EmailOtpType | null) ?? fallbackType;
  const code = params.get("code");

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    return error ? { ok: false, detail: error.message } : { ok: true };
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error ? { ok: false, detail: error.message } : { ok: true };
  }

  return { ok: false, detail: "Link carried no token" };
}
