"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { updateProfileAvailability } from "@/lib/api/profile-availability";
import { createClient } from "@/lib/supabase/server";
import { validatePasswordChange } from "@/lib/password";
import {
  parseContactDetails,
  validateDisplayName,
  validatePickupLocation,
} from "@/lib/contact-details";
import { defaultProfileView, profilePath } from "@/lib/routes";
import { clearLoginAttempts, lockoutMessage, recordFailedLogin } from "@/lib/login-attempts";
import type { FieldErrors } from "@/lib/api/client";

/**
 * What the member typed, handed back so a rejected submission can be
 * redisplayed.
 *
 * React 19 resets a form once its action returns, so without this every
 * validation failure would clear the whole form — including the role ticks
 * that decide whether the pickup location is even shown. Being made to retype
 * every field because one was wrong is how people give up on a signup.
 */
export type OnboardingValues = {
  display_name: string;
  contact_number: string;
  default_pickup_location: string;
  bio: string;
  wants_to_rent: boolean;
  wants_to_own: boolean;
};

export type OnboardingState =
  | { error?: string; fieldErrors?: FieldErrors; values?: OnboardingValues }
  | undefined;

/** Shown alongside the per-field messages, so the summary is written once. */
const CORRECT_FIELDS = "Please correct the highlighted fields.";

/**
 * Records what the member came here to do, their contact details, and marks
 * first-run setup complete.
 *
 * The update goes through the member's own session, so Row Level Security is
 * what confines it to their row — the id is never taken from the form.
 *
 * Completing this is also what gives the member a wallet: the
 * profiles_create_wallet_on_onboarding trigger fires on the onboarded_at
 * transition below. Nothing here has to ask for one.
 */
export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const wantsToRent = formData.get("wants_to_rent") === "on";
  const wantsToOwn = formData.get("wants_to_own") === "on";
  const displayName = String(formData.get("display_name") ?? "").trim();

  // Echoed back on every rejection so the form can redisplay itself.
  const values: OnboardingValues = {
    display_name: displayName,
    contact_number: String(formData.get("contact_number") ?? ""),
    default_pickup_location: String(formData.get("default_pickup_location") ?? ""),
    bio: String(formData.get("bio") ?? ""),
    wants_to_rent: wantsToRent,
    wants_to_own: wantsToOwn,
  };

  if (!wantsToRent && !wantsToOwn) {
    return { error: "Pick at least one. You can change this later.", values };
  }

  const contactResult = parseContactDetails(formData, { wantsToRent, wantsToOwn });

  // Both are reported together, so a member missing a name *and* a location is
  // told about both at once rather than one per submission.
  const displayNameError = validateDisplayName(displayName);

  if (!contactResult.ok) {
    const fieldErrors: FieldErrors = { ...contactResult.fieldErrors };
    if (displayNameError) fieldErrors.display_name = displayNameError;
    return { error: CORRECT_FIELDS, fieldErrors, values };
  }
  if (displayNameError) {
    return {
      error: CORRECT_FIELDS,
      fieldErrors: { display_name: displayNameError },
      values,
    };
  }

  const parsed = contactResult.values;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      wants_to_rent: wantsToRent,
      wants_to_own: wantsToOwn,
      contact_number: parsed.contact_number,
      default_pickup_location: parsed.default_pickup_location,
      bio: parsed.bio,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    // Selecting back is what proves a row was actually written. An update
    // matching nothing reports no error, so without this a member whose
    // profiles row is missing would be sent here by the middleware gate,
    // "succeed", and be sent straight back — a loop with no way out.
    .select("id");

  if (error) return { error: error.message, values };
  if (!data || data.length === 0) {
    return {
      error: "We could not find your profile to update. Please log in again.",
      values,
    };
  }

  revalidatePath("/profile");
  redirect(profilePath(defaultProfileView({ wantsToRent, wantsToOwn })));
}

/**
 * Opts the member into renting, so choosing "list my gear" on day one is not a
 * dead end. Nothing to ask: where a booking is collected is agreed per
 * booking.
 */
export async function enableRenting() {
  await enableSide("wants_to_rent");
}

/**
 * Opts the member into owning, which unlike renting has a question attached.
 *
 * Onboarding will not create an owner without a pickup location, and this is
 * the only other way to become one, so it applies the same rule rather than
 * flipping the boolean and leaving the column null — see EnableOwningForm.
 */
export async function enableOwning(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const location = String(formData.get("default_pickup_location") ?? "").trim();

  const locationError = validatePickupLocation(location);
  if (locationError) {
    return { error: CORRECT_FIELDS, fieldErrors: { default_pickup_location: locationError } };
  }

  return enableSide("wants_to_own", location);
}

export async function saveProfileAvailability(
  _previous: { error?: string; saved?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  try {
    const days = JSON.parse(String(formData.get("available_days") ?? "[]"));
    if (!Array.isArray(days) || days.length === 0) return { error: "Choose at least one day." };
    await updateProfileAvailability(days);
    return { saved: true };
  } catch {
    return { error: "We could not save your availability. Please try again." };
  }
}

/**
 * Turns on a side of the marketplace, with the pickup location the owning side
 * requires. Callers validate it; this writes it.
 */
async function enableSide(
  column: "wants_to_rent" | "wants_to_own",
  pickupLocation?: string,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const update: Record<string, boolean | string> = { [column]: true };
  if (pickupLocation) update.default_pickup_location = pickupLocation;

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/profile");
  return undefined;
}

export type FormState =
  | { error?: string; success?: string; fieldErrors?: FieldErrors }
  | undefined;

/** Renames the member. RLS confines the write to their own row. */
export async function updateDisplayName(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const displayName = String(formData.get("display_name") ?? "").trim();

  const displayNameError = validateDisplayName(displayName);
  if (displayNameError) {
    return { error: CORRECT_FIELDS, fieldErrors: { display_name: displayNameError } };
  }

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

/** Updates the contact number, pickup location and bio collected at onboarding. */
export async function updateContactDetails(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Read from the row, never from the form. Whether the pickup location is
  // *required* depends on the roles held, so a submitted "wants_to_own=" would
  // waive the rule while the stored role stayed true — producing the owner with
  // nowhere to hand gear over that the rule exists to prevent.
  const { data: profile } = await supabase
    .from("profiles")
    .select("wants_to_rent, wants_to_own")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return { error: "We could not find your profile. Please log in again." };
  }

  const roles = { wantsToRent: profile.wants_to_rent, wantsToOwn: profile.wants_to_own };

  const contactResult = parseContactDetails(formData, roles);
  if (!contactResult.ok) {
    return { error: CORRECT_FIELDS, fieldErrors: contactResult.fieldErrors };
  }
  const { values } = contactResult;

  // The pickup location only when the member owns. A disabled or unrendered
  // select submits nothing, which parses as null — writing that unconditionally
  // would wipe a stored location the moment a member who has since stopped
  // owning edited their bio.
  const update: Record<string, string | null> = {
    contact_number: values.contact_number,
    bio: values.bio,
  };
  if (roles.wantsToOwn) update.default_pickup_location = values.default_pickup_location;

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: "Contact details updated." };
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

  const fieldErrors = validatePasswordChange(currentPassword, newPassword, confirmPassword);
  if (Object.keys(fieldErrors).length > 0) return { error: CORRECT_FIELDS, fieldErrors };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  // The limiter has to cover this path too. It is the *other* place a password
  // is checked, and it is reachable with nothing but a session — exactly the
  // attacker this function's re-authentication exists to stop. Guarding only
  // the login form would leave an unlimited guessing oracle behind it, with no
  // lockout to warn the owner either.
  const lockout = await lockoutMessage(supabase, user.email);
  if (lockout) {
    return { error: CORRECT_FIELDS, fieldErrors: { current_password: lockout } };
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauthError) {
    await recordFailedLogin(supabase, user.email);
    return {
      error: CORRECT_FIELDS,
      fieldErrors: { current_password: "Current password is incorrect." },
    };
  }

  await clearLoginAttempts(supabase);

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };

  return { success: "Password changed." };
}
