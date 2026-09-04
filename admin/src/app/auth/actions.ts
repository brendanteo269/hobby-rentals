"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string } | undefined;

/**
 * Signs an administrator in.
 *
 * The role is not checked here. Supabase issues a session to any valid
 * account, and refusing to complete the sign-in for non-admins would tell an
 * attacker which addresses hold the role. Instead the session is granted and
 * the proxy sends anyone without the role to /forbidden, which shows nothing.
 */
export async function logIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Email and password are both required." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/users");
}

/**
 * Ends the session.
 *
 * In local development this also signs the account out of the public site on
 * port 3000: cookies are scoped by host, and ports do not distinguish hosts.
 * In production the two run on separate hostnames and hold separate sessions.
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
