"use server";

import { revalidatePath } from "next/cache";
import { requirePortalSession } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROUTES } from "@/lib/routes";

export type SuspendBanState = { error?: string; success?: string } | undefined;

/** The database prefixes the refusals the UI cares about with a code ("ALREADY_ENFORCED: …"); the code is for the database, not the admin. */
const ERROR_CODE_PREFIX = /^[A-Z_]+: /;

const KIND_BY_ACTION = { suspend: "SUSPENSION", ban: "BAN" } as const;

/**
 * Suspends (until the end of a chosen day, Singapore time) or bans a member
 * (S3-24; the page calls it Suspend / Ban). The database function does the work atomically - records the
 * enforcement, ends their sessions, pauses or deactivates their listings,
 * ends or flags their bookings, tells them and writes the audit entry - so
 * this action only parses the form and passes a refusal through.
 */
export async function suspendOrBanUser(_prev: SuspendBanState, formData: FormData): Promise<SuspendBanState> {
  await requirePortalSession();

  const userId = String(formData.get("user_id") ?? "");
  const action = String(formData.get("action") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const endsOn = String(formData.get("ends_on") ?? "");

  if (action !== "suspend" && action !== "ban") return { error: "Choose to suspend or ban the member." };
  if (!reason) return { error: "A reason is required." };
  if (action === "suspend" && !/^\d{4}-\d{2}-\d{2}$/.test(endsOn)) return { error: "Choose the day the suspension ends." };

  const { error } = await createAdminClient().rpc("admin_enforce_user", {
    p_user_id: userId,
    p_kind: KIND_BY_ACTION[action],
    p_reason: reason,
    p_ends_at: action === "suspend" ? `${endsOn}T23:59:59+08:00` : null,
  });
  if (error) return { error: error.message.replace(ERROR_CODE_PREFIX, "") };

  revalidatePath(ROUTES.user(userId));
  revalidatePath(ROUTES.users);
  return {
    success:
      action === "ban"
        ? "Member banned. They are signed out, and their listings and bookings have been dealt with."
        : "Member suspended. They are signed out, and their listings are paused until it ends.",
  };
}

/**
 * Lifts a member's suspension early (S3-24), with a reason. A ban is permanent
 * and the database refuses to lift one, whatever is asked here. The database
 * clears the account's ban, puts back the listings the suspension paused,
 * tells the member and writes the audit entry; bookings it ended stay ended.
 */
export async function liftSuspension(_prev: SuspendBanState, formData: FormData): Promise<SuspendBanState> {
  await requirePortalSession();

  const userId = String(formData.get("user_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { error: "A reason is required." };

  const { error } = await createAdminClient().rpc("admin_lift_suspension", { p_user_id: userId, p_reason: reason });
  if (error) return { error: error.message.replace(ERROR_CODE_PREFIX, "") };

  revalidatePath(ROUTES.user(userId));
  revalidatePath(ROUTES.users);
  return { success: "Suspension lifted. The member can sign in again, and their paused listings are live." };
}
