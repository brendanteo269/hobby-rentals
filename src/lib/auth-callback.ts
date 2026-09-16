import "server-only";

import type { EmailOtpType, SupabaseClient } from "@supabase/supabase-js";
import { resolveLinkType } from "@/lib/route-policy";

/**
 * Turns whichever shape of email link Supabase sent into a session.
 *
 * Handles both:
 *  - `token_hash` + `type`, from a template using {{ .TokenHash }}. Works on
 *    any device, because it carries no PKCE verifier.
 *  - `code`, from the default {{ .ConfirmationURL }} template. Only works in
 *    the browser that started the flow, which holds the PKCE verifier cookie.
 *
 * What the link was *for* is decided by the caller and enforced here. Each
 * callback route accepts only the types it exists to serve, because the route
 * a link arrives at is what grants privileges on the far side — a password
 * reset ends in the right to set a password without knowing the old one, and a
 * signup confirmation must never reach that. Treating the URL's `type` as
 * merely a hint, and falling back to what the route wanted, let a signup token
 * opened at the recovery route claim exactly that privilege.
 */
export type CallbackResult = { ok: true } | { ok: false; detail: string };

export async function exchangeEmailLink(
  supabase: SupabaseClient,
  params: URLSearchParams,
  /** The only OTP types this route will act on. */
  allowed: readonly EmailOtpType[],
): Promise<CallbackResult> {
  // A link Supabase has already rejected comes back carrying its reason and no
  // token at all — an expired or reused one, most often. Reading it here is
  // what keeps the log saying "Email link is invalid or has expired" rather
  // than the misleading "carried no token" the checks below would conclude.
  const suppliedError = params.get("error_description") ?? params.get("error");
  if (suppliedError) return { ok: false, detail: suppliedError };

  const tokenHash = params.get("token_hash");
  const code = params.get("code");

  if (tokenHash) {
    const claimed = params.get("type");
    const type = resolveLinkType(claimed, allowed);

    if (!type) {
      return { ok: false, detail: `Link type ${claimed ?? "(absent)"} is not valid here` };
    }

    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    return error ? { ok: false, detail: error.message } : { ok: true };
  }

  if (code) {
    // A PKCE code carries no type at all, so the route is the only thing that
    // can say what it was for. That is safe here and not above precisely
    // because there is no competing claim in the URL to be believed over it.
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error ? { ok: false, detail: error.message } : { ok: true };
  }

  return { ok: false, detail: "Link carried no token" };
}
