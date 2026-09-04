import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

export default async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and images, so the session
     * cookie is refreshed and the admin role is checked on every real request.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
