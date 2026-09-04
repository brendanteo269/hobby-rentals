import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in administrator, or null.
 *
 * getUser() is used rather than getSession() because it revalidates the token
 * with Supabase; a session read straight from the cookie is only as
 * trustworthy as the cookie. The role then comes from is_admin(), which reads
 * user_roles under the caller's own identity — so a forged cookie fails at
 * the first step and an ordinary member fails at the second.
 */
export async function getAdminUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: isAdmin, error } = await supabase.rpc("is_admin");

  if (error) {
    // Treat an unreadable role as no role. The alternative — assuming the
    // best on failure — would turn a database blip into open access.
    console.error("Failed to check admin role:", error.message);
    return null;
  }

  return isAdmin === true ? user : null;
}

/**
 * Guards a page or action, returning the administrator when there is one.
 *
 * Anonymous visitors are sent to log in; signed-in members who are not
 * administrators are sent to the refusal page, which shows nothing about any
 * account. The proxy already turns both away before a page renders — this is
 * the second of three layers, the third being the database functions
 * themselves, each of which re-checks the caller.
 */
export async function requireAdmin(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = await getAdminUser();
  if (!admin) redirect("/forbidden");

  return admin;
}
