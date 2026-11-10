import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normaliseReferralCode } from "@/lib/referrals";
import { rememberReferralCode } from "@/lib/referral-cookie";
import { signupPath } from "@/lib/routes";

/**
 * S6-07: where a member's referral link lands.
 *
 * A signed-out visitor has the code remembered and is sent to sign up with
 * it filled in. A member already signed in cannot be referred - a referral is
 * recorded only when an account is created - so they are sent to browse
 * rather than shown a signup form they cannot use.
 *
 * A malformed code is not an error page: the visitor still came to sign up,
 * so they get the form, just without a code.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return NextResponse.redirect(new URL("/browse", request.url));

  const code = normaliseReferralCode((await params).code);
  if (code) await rememberReferralCode(code);

  return NextResponse.redirect(new URL(signupPath(code), request.url));
}
