"use server";

import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { endPortalSession, isCorrectPassword, startPortalSession } from "@/lib/portal-auth";

export type AuthState = { error?: string } | undefined;

/**
 * Opens the portal for anyone who knows the shared password.
 *
 * The failure message says only that the password was wrong. There is no
 * account to be found or not found here, so there is nothing else to say, and
 * nothing to be learned by asking repeatedly.
 */
export async function enterPortal(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");

  if (!password) return { error: "Enter the admin password." };

  // Never logged, never echoed back in the returned state.
  if (!(await isCorrectPassword(password))) {
    return { error: "That password is not correct." };
  }

  await startPortalSession();
  redirect(ROUTES.users);
}

/** Closes the portal on this browser. Nothing else is signed out. */
export async function leavePortal() {
  await endPortalSession();
  redirect(ROUTES.login);
}
