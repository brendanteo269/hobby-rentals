import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/env";
import { cookies } from "next/headers";

/** Supabase client for Server Components, Server Actions and Route Handlers. */
export async function createClient() {
  const { url, publishableKey } = supabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(
    url,
    publishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, which cannot write cookies.
            // Safe to ignore: middleware refreshes the session on every request.
          }
        },
      },
    },
  );
}
