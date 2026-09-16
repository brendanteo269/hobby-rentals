"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ACTIVITY_COOKIE } from "@/lib/session-policy";
import { validatePasswordComplexity } from "@/lib/password";

export type AuthState = { error?: string } | undefined;

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);

  if (!email || !password) return { error: "Email and password are both required." };

  const passwordError = validatePasswordComplexity(password);
  if (passwordError) return { error: passwordError };

  if (formData.get("terms") !== "on") {
    return { error: "You must accept the Terms and Conditions to create an account." };
  }

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();

  // display_name rides along in user metadata; the on_auth_user_created
  // trigger copies it into public.profiles when the row is created.
  const displayName = String(formData.get("display_name") ?? "").trim();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=/profile`,
      data: displayName ? { display_name: displayName } : undefined,
    },
  });

  if (error) return { error: error.message };

  // Supabase returns success whether or not the address is already registered,
  // so the copy on the next screen must stay neutral about that.
  redirect(`/check-email?email=${encodeURIComponent(email)}`);
}

export async function logIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: "Email and password are both required." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/profile");
}

/**
 * Ends the session on the member's command.
 *
 * The default "global" scope is deliberate: logging out revokes every refresh
 * token issued to this account, so a token copied off this machine is dead
 * too. The access token already in hand stays technically valid until its own
 * short expiry — it cannot be recalled — but it can no longer be renewed, and
 * the cookies carrying it are gone.
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });

  (await cookies()).delete(ACTIVITY_COOKIE);

  // Drops any cached render still holding the signed-in header.
  revalidatePath("/", "layout");
  redirect("/login?reason=signed-out");
}
