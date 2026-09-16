import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/env";
import { ACTIVITY_COOKIE, idleTimeoutMs } from "@/lib/session-policy";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Routes requiring a signed-in member. /onboarding is included so first-run
 * setup cannot be reached anonymously. /browse and /listings read from the
 * FastAPI backend, which rejects an anonymous caller — guarding them here
 * turns a redirect out of a half-rendered page into a clean trip to the login
 * screen, with `next` set so the member lands back where they were going.
 */
const PROTECTED_PREFIXES = ["/profile", "/onboarding", "/browse", "/listings"];

/**
 * Clears every cookie holding auth state.
 *
 * signOut() normally does this through the cookie adapter, but it talks to
 * Supabase first and can throw before it gets there. Matching on the name
 * covers that case and the chunked form (`...auth-token.0`) that @supabase/ssr
 * writes when a session is too large for one cookie, so a failed revoke still
 * leaves the browser logged out locally.
 */
function clearAuthCookies(request: NextRequest, response: NextResponse) {
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token")) {
      response.cookies.delete(cookie.name);
    }
  }
  response.cookies.delete(ACTIVITY_COOKIE);
}

/** Carries cookie writes already made onto a response we are replacing. */
function withCookiesFrom(source: NextResponse, target: NextResponse) {
  for (const cookie of source.cookies.getAll()) target.cookies.set(cookie);
  return target;
}

function loginRedirect(
  request: NextRequest,
  { reason, next }: { reason?: string; next?: string } = {},
) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.search = "";
  loginUrl.pathname = "/login";
  if (reason) loginUrl.searchParams.set("reason", reason);
  if (next) loginUrl.searchParams.set("next", next);
  return NextResponse.redirect(loginUrl);
}

/**
 * Refreshes the auth session cookie on every request, enforces the inactivity
 * timeout, and guards protected routes. Must run in middleware so Server
 * Components always see a fresh token and no route can be reached with a
 * session that should already have ended.
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

  if (!user) {
    // Nothing to keep alive, and a stale last-seen value must not survive to
    // be read against the next session.
    response.cookies.delete(ACTIVITY_COOKIE);
    if (isProtected) {
      // No reason here: someone who simply never logged in should not be told
      // their session expired. The expiry message is set at the moment the
      // session is ended, below.
      return withCookiesFrom(response, loginRedirect(request, { next: pathname }));
    }
    return response;
  }

  const lastSeen = Number(request.cookies.get(ACTIVITY_COOKIE)?.value);
  // A missing or corrupt cookie reads as "just seen": this is the first
  // request of a session, and starting the clock now is the safe reading.
  const idleFor = Number.isFinite(lastSeen) ? Date.now() - lastSeen : 0;

  if (idleFor > idleTimeoutMs()) {
    try {
      // Local scope: this browser's refresh token is revoked, while the same
      // member's other devices — which may not be idle — keep their sessions.
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Revoking is best-effort; clearing the cookies below is not, and is
      // what actually ends the session for this browser.
    }

    // The session is over wherever the member happened to land. Only a
    // protected page sends them to the login screen — being bounced there off
    // the marketing home page would be surprising, and nothing there needs a
    // session anyway.
    if (isProtected) {
      const redirectResponse = withCookiesFrom(
        response,
        loginRedirect(request, { reason: "expired", next: pathname }),
      );
      clearAuthCookies(request, redirectResponse);
      return redirectResponse;
    }

    clearAuthCookies(request, response);
    return response;
  }

  response.cookies.set(ACTIVITY_COOKIE, String(Date.now()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return response;
}
