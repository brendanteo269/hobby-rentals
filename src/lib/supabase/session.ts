import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/env";
import { NextResponse, type NextRequest } from "next/server";

/** Routes that require an authenticated, email-verified user. */
// Routes requiring a signed-in member. /onboarding is included so first-run
// setup cannot be reached anonymously.
const PROTECTED_PREFIXES = ["/profile", "/onboarding"];

/**
 * Refreshes the auth session cookie on every request and guards protected
 * routes. Must run in middleware so Server Components always see a fresh token.
 */
export async function updateSession(request: NextRequest) {
  const { url, publishableKey } = supabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    url,
    publishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and getUser(): getUser()
  // revalidates the token with Supabase, and anything in between risks
  // logging users out at random.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
