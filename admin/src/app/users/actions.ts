"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { recordAdminAction } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserById, isEmailVerified } from "@/lib/users";
import { publicSiteUrl } from "@/lib/env";

export type VerificationState = { error?: string; success?: string } | undefined;

/** Members follow verification links into the public site, never into this portal. */
const CONFIRM_REDIRECT = `${publicSiteUrl()}/auth/confirm?next=/profile`;

/**
 * Sends the confirmation email again, for a member who never received it.
 *
 * Uses the ordinary resend endpoint rather than an admin one, so the email is
 * the same message the member would have got at signup — a different template
 * here would be a second thing to keep in step with the first.
 */
export async function resendVerificationEmail(
  _prev: VerificationState,
  formData: FormData,
): Promise<VerificationState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("user_id") ?? "");

  const user = await getUserById(userId);
  if (!user?.email) return { error: "That account no longer exists." };

  if (isEmailVerified(user)) {
    return { error: "This address is already verified. Reset verification to require it again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: user.email,
    options: { emailRedirectTo: CONFIRM_REDIRECT },
  });

  // Supabase rate-limits this endpoint, and the message it returns explains
  // how long to wait, so it is worth showing rather than replacing.
  if (error) return { error: error.message };

  await recordAdminAction("verification_email_resent", userId, {
    email: user.email,
    actor_email: admin.email,
  });

  revalidatePath(`/users/${userId}`);
  return { success: `Verification email sent to ${user.email}.` };
}

/**
 * Marks a verified address unverified and sends a fresh link.
 *
 * For an address that was confirmed but should be proven again — a support
 * handover, or a suspected compromise. The member cannot sign in until they
 * confirm, which is the point, and also why an administrator is not allowed
 * to do this to their own account: it would lock them out of the portal with
 * no way back in.
 */
export async function resetVerification(
  _prev: VerificationState,
  formData: FormData,
): Promise<VerificationState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("user_id") ?? "");

  if (userId === admin.id) {
    return { error: "You cannot reset verification on your own account." };
  }

  const user = await getUserById(userId);
  if (!user?.email) return { error: "That account no longer exists." };

  const wasVerified = isEmailVerified(user);

  // The only step in this file that needs the secret key: clearing a
  // confirmation is an admin-API write, and there is no user session to do it
  // under. requireAdmin() above is what stands in for one.
  const adminClient = createAdminClient();
  const { error: clearError } = await adminClient.auth.admin.updateUserById(userId, {
    email_confirm: false,
  });
  if (clearError) return { error: clearError.message };

  const supabase = await createClient();
  const { error: sendError } = await supabase.auth.resend({
    type: "signup",
    email: user.email,
    options: { emailRedirectTo: CONFIRM_REDIRECT },
  });

  await recordAdminAction("verification_reset", userId, {
    email: user.email,
    actor_email: admin.email,
    was_verified: wasVerified,
    // The reset itself landed; only the email did not. Recorded so the
    // timeline does not imply a message the member never received.
    email_sent: !sendError,
  });

  revalidatePath(`/users/${userId}`);

  if (sendError) {
    return {
      error: `Verification was reset, but the email could not be sent: ${sendError.message}`,
    };
  }

  return {
    success: wasVerified
      ? `Verification reset. ${user.email} must confirm again before signing in.`
      : `Verification restarted. A fresh link is on its way to ${user.email}.`,
  };
}
