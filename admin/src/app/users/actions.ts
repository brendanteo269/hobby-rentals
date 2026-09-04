"use server";

import { revalidatePath } from "next/cache";
import { requirePortalSession } from "@/lib/admin";
import { recordAdminAction } from "@/lib/audit";
import { createAnonClient } from "@/lib/supabase/anon";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserById, isEmailVerified } from "@/lib/users";
import { publicSiteUrl } from "@/lib/env";
import { ROUTES } from "@/lib/routes";

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
  await requirePortalSession();
  const userId = String(formData.get("user_id") ?? "");

  const user = await getUserById(userId);
  if (!user?.email) return { error: "That account no longer exists." };

  if (isEmailVerified(user)) {
    return { error: "This address is already verified. Reset verification to require it again." };
  }

  const { error } = await createAnonClient().auth.resend({
    type: "signup",
    email: user.email,
    options: { emailRedirectTo: CONFIRM_REDIRECT },
  });

  // Supabase rate-limits this endpoint, and the message it returns explains
  // how long to wait, so it is worth showing rather than replacing.
  if (error) return { error: error.message };

  await recordAdminAction("verification_email_resent", userId, { email: user.email });

  revalidatePath(ROUTES.user(userId));
  return { success: `Verification email sent to ${user.email}.` };
}

/**
 * Marks a verified address unverified and sends a fresh link.
 *
 * For an address that was confirmed but should be proven again — a support
 * handover, or a suspected compromise. The member cannot sign in until they
 * confirm, which is the point.
 *
 * There is no "not on your own account" guard any more: the portal has no
 * per-administrator identity to compare against. An administrator's own
 * member account can be reset from here, and the way back in is the shared
 * password, which this does not touch.
 */
export async function resetVerification(
  _prev: VerificationState,
  formData: FormData,
): Promise<VerificationState> {
  await requirePortalSession();
  const userId = String(formData.get("user_id") ?? "");

  const user = await getUserById(userId);
  if (!user?.email) return { error: "That account no longer exists." };

  const wasVerified = isEmailVerified(user);

  // Clearing a confirmation is an Auth admin write, so it needs the secret
  // key. requirePortalSession() above is what stands in for a session.
  const { error: clearError } = await createAdminClient().auth.admin.updateUserById(userId, {
    email_confirm: false,
  });
  if (clearError) return { error: clearError.message };

  const { error: sendError } = await createAnonClient().auth.resend({
    type: "signup",
    email: user.email,
    options: { emailRedirectTo: CONFIRM_REDIRECT },
  });

  await recordAdminAction("verification_reset", userId, {
    email: user.email,
    was_verified: wasVerified,
    // The reset itself landed; only the email did not. Recorded so the
    // timeline does not imply a message the member never received.
    email_sent: !sendError,
  });

  revalidatePath(ROUTES.user(userId));

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
