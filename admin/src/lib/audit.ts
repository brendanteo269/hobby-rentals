import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Every action the portal is allowed to record.
 *
 * Keyed by the string written to the database, so the stored value and the
 * label shown in the timeline cannot drift apart, and adding an action means
 * adding it here rather than typing a literal at the call site.
 */
export const AUDIT_ACTIONS = {
  verification_email_resent: "Verification email resent",
  verification_reset: "Verification reset",
} as const;

export type AuditAction = keyof typeof AUDIT_ACTIONS;

/**
 * How an action is attributed while the portal uses one shared password.
 *
 * It describes the door that was opened, not the person who walked through
 * it — there is no way to tell them apart. Restoring per-administrator
 * sign-in is what would make this a name.
 */
const ACTOR_LABEL = "Shared admin session";

export type AuditEntry = {
  id: number;
  action: AuditAction;
  label: string;
  actorLabel: string;
  detail: Record<string, unknown>;
  created_at: string;
};

type AuditRow = {
  id: number;
  action: string;
  actor_label: string;
  detail: Record<string, unknown> | null;
  created_at: string;
};

/** Falls back to the raw action so an entry written by a later version of the portal still renders. */
function labelFor(action: string): string {
  return AUDIT_ACTIONS[action as AuditAction] ?? action;
}

/** The audit trail for one account, newest first. */
export async function getUserAuditTrail(userId: string, limit = 20): Promise<AuditEntry[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("id, action, actor_label, detail, created_at")
    .eq("target_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to load audit trail:", error.message);
    return [];
  }

  return ((data ?? []) as AuditRow[]).map((row) => ({
    id: row.id,
    action: row.action as AuditAction,
    label: labelFor(row.action),
    actorLabel: row.actor_label,
    detail: row.detail ?? {},
    created_at: row.created_at,
  }));
}

/**
 * Writes an entry to the audit trail.
 *
 * Goes through record_admin_action rather than inserting directly: the table
 * has no insert policy, and the function is what decides whether the caller
 * is allowed to write at all.
 */
export async function recordAdminAction(
  action: AuditAction,
  targetUserId: string,
  detail: Record<string, unknown> = {},
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("record_admin_action", {
    action,
    target_user_id: targetUserId,
    detail,
    actor_label: ACTOR_LABEL,
  });

  // An action that succeeded but went unrecorded is worth knowing about, but
  // it is not worth failing the action the administrator actually asked for.
  if (error) console.error(`Failed to record "${action}":`, error.message);
}
