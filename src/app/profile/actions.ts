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
