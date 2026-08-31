"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type OnboardingState = { error?: string } | undefined;

/**
 * Records what the member came here to do, and marks first-run setup complete.
 *
 * The update goes through the member's own session, so Row Level Security is
 * what confines it to their row — the id is never taken from the form.
 */
export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const wantsToRent = formData.get("wants_to_rent") === "on";
  const wantsToOwn = formData.get("wants_to_own") === "on";

  if (!wantsToRent && !wantsToOwn) {
    return { error: "Pick at least one. You can change this later." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({
      wants_to_rent: wantsToRent,
      wants_to_own: wantsToOwn,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  redirect("/profile");
}

/**
 * Opts the member into the side of the marketplace they skipped at signup, so
 * choosing "rent only" on day one is not a dead end.
 */
export async function enableRenting() {
  await enableSide("wants_to_rent");
}

export async function enableOwning() {
  await enableSide("wants_to_own");
}

async function enableSide(column: "wants_to_rent" | "wants_to_own") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("profiles")
    .update({ [column]: true })
    .eq("id", user.id);

  revalidatePath("/profile");
}

export type FormState = { error?: string; success?: string } | undefined;

/** Renames the member. RLS confines the write to their own row. */
export async function updateDisplayName(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const displayName = String(formData.get("display_name") ?? "").trim();

  if (!displayName) return { error: "Display name cannot be empty." };
  if (displayName.length > 60) return { error: "Display name must be 60 characters or fewer." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: "Display name updated." };
}

/**
 * Changes the account password.
 *
 * The current password is re-checked first. Supabase would happily update the
 * password from the session alone, which means anyone who got hold of a live
 * session could lock the owner out of their own account. Proving knowledge of
 * the existing password closes that.
 */
export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!currentPassword || !newPassword) return { error: "All password fields are required." };
  if (newPassword.length < 8) return { error: "New password must be at least 8 characters." };
  if (newPassword !== confirmPassword) return { error: "New passwords do not match." };
  if (newPassword === currentPassword) {
    return { error: "The new password is the same as the current one." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauthError) return { error: "Current password is incorrect." };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };

  return { success: "Password changed." };
}
