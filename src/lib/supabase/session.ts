import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "@/lib/env";
import { ACTIVITY_COOKIE, idleTimeoutMs, type LoginNoticeReason } from "@/lib/session-policy";
import { ONBOARDING_PATH, checkEmailPath, loginPath } from "@/lib/routes";
import { requiresOnboarding, requiresSignIn, requiresVerifiedEmail } from "@/lib/route-policy";
import { NextResponse, type NextRequest } from "next/server";

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
  { reason, next }: { reason?: LoginNoticeReason; next?: string } = {},
) {
  const loginUrl = new URL(loginPath(), request.url);
  if (reason) loginUrl.searchParams.set("reason", reason);
  if (next) loginUrl.searchParams.set("next", next);
  return NextResponse.redirect(loginUrl);
}

/**
 * Whether first-run setup is still outstanding.
 *
 * Read through the member's own session, so Row Level Security confines it to
 * their row — the same reasoning as getOwnProfile. This costs a query, which is
 * why the caller only asks on gated paths; the marketing pages never pay it.
 *
 * Fails *open*. Being unable to read the profile is not evidence that
 * onboarding is outstanding, and treating it that way would turn a database
 * blip into every signed-in member being herded onto the onboarding form.
 */
async function needsOnboarding(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Onboarding check failed:", error.message);
    return false;
  }

  // A missing row is a member whose signup trigger did not fire. Sending them
  // to onboarding is right: the form is where that gets put back together.
  return !data?.onboarded_at;
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
  const isProtected = requiresSignIn(pathname);

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

  // Checked after the session is refreshed, not before: a member who confirms
  // their address in another tab should be let through on their next request
  // without having to log in again.
  if (!user.email_confirmed_at && requiresVerifiedEmail(pathname)) {
    return withCookiesFrom(
      response,
      NextResponse.redirect(new URL(checkEmailPath(user.email), request.url)),
    );
  }

  // S1-02 AC5. Checked after verification, because a member who has not
  // confirmed their address should be told to do that rather than sent to fill
  // in a form they cannot use the result of yet.
  if (requiresOnboarding(pathname) && (await needsOnboarding(supabase, user.id))) {
    return withCookiesFrom(
      response,
      NextResponse.redirect(new URL(ONBOARDING_PATH, request.url)),
    );
  }

  return response;
}
