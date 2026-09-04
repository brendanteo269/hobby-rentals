import { NextResponse, type NextRequest } from "next/server";
import { PORTAL_COOKIE_NAME, isValidSessionToken } from "@/lib/portal-auth";
import { PUBLIC_PATHS, ROUTES } from "@/lib/routes";

/**
 * Gates the whole portal on the shared password.
 *
 * Denies by default: anything not named in PUBLIC_PATHS needs a valid session
 * cookie. This is the outer of two checks — requirePortalSession() repeats it
 * in every page and action, so a change to the matcher below cannot silently
 * open a route.
 *
 * The cookie is verified, not merely present: its value must match the digest
 * of the current password, so it cannot be forged by inventing a cookie and
 * it stops working the moment the password changes.
 */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const signedIn = await isValidSessionToken(request.cookies.get(PORTAL_COOKIE_NAME)?.value);

  if (isPublic) {
    // Nothing to ask someone who has already answered.
    if (signedIn) return redirectTo(request, ROUTES.users);
    return NextResponse.next();
  }

  if (!signedIn) return redirectTo(request, ROUTES.login);

  return NextResponse.next();
}

function redirectTo(request: NextRequest, pathname: string) {
  const target = request.nextUrl.clone();
  target.pathname = pathname;
  target.search = "";
  return NextResponse.redirect(target);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and images, so every real
     * request is checked for the portal session.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
