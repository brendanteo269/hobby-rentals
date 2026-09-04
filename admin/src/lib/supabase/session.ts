import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/env";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Routes reachable without the admin role.
 *
 * The list is short by design: everything in this portal is privileged, so
 * the guard below denies by default and these are the stated exceptions.
 * /auth is here because the confirmation callback must be able to complete
 * before a session exists.
 */
const PUBLIC_PREFIXES = ["/login", "/forbidden", "/auth"];

/**
 * Refreshes the session cookie and gates the whole portal on the admin role.
 *
 * This is the outermost of three checks. It stops a non-admin before a page
 * renders; requireAdmin() stops one that reaches a page or action anyway; and
 * the database functions refuse a caller who somehow gets past both. The
 * layers are independent on purpose — the portal reads account data that Row
 * Level Security cannot protect, because auth.users has no policies to apply.
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
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
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  if (isPublic) {
    // An administrator who is already signed in has no use for the login page.
    if (pathname.startsWith("/login") && user && (await hasAdminRole(supabase))) {
      return redirectTo(request, "/users");
    }
    return response;
  }

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!(await hasAdminRole(supabase))) return redirectTo(request, "/forbidden");

  return response;
}

/** Asks the database, not the token: roles are revocable, a signed token is not. */
async function hasAdminRole(supabase: ReturnType<typeof createServerClient>): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_admin");
  if (error) {
    console.error("Admin role check failed:", error.message);
    return false;
  }
  return data === true;
}

function redirectTo(request: NextRequest, pathname: string) {
  const target = request.nextUrl.clone();
  target.pathname = pathname;
  target.search = "";
  return NextResponse.redirect(target);
}
