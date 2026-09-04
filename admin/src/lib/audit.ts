import { createClient } from "@/lib/supabase/server";
import { shortId } from "@/lib/format";

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

export type AuditEntry = {
  id: number;
  action: AuditAction;
  label: string;
  actorName: string;
  detail: Record<string, unknown>;
  created_at: string;
};

type AuditRow = {
  id: number;
  action: string;
  actor_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

/** Falls back to the raw action so an entry written by a later version of the portal still renders. */
function labelFor(action: string): string {
  return AUDIT_ACTIONS[action as AuditAction] ?? action;
}

/**
 * The audit trail for one account, newest first.
 *
 * Actor names are fetched separately rather than joined: admin_audit_log
 * references auth.users, not profiles, so there is no foreign key for
 * PostgREST to follow. One extra query for the handful of distinct actors on
 * a page is cheaper than reshaping the table around the query.
 */
export async function getUserAuditTrail(userId: string, limit = 20): Promise<AuditEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("id, action, actor_id, detail, created_at")
    .eq("target_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to load audit trail:", error.message);
    return [];
  }

  const rows = (data ?? []) as AuditRow[];
  const actorNames = await getActorNames(rows);

  return rows.map((row) => ({
    id: row.id,
    action: row.action as AuditAction,
    label: labelFor(row.action),
    actorName: row.actor_id
      ? (actorNames.get(row.actor_id) ?? `Admin ${shortId(row.actor_id)}`)
      : "Deleted account",
    detail: row.detail ?? {},
    created_at: row.created_at,
  }));
}

async function getActorNames(rows: AuditRow[]): Promise<Map<string, string>> {
  const ids = [...new Set(rows.map((r) => r.actor_id).filter((id): id is string => id !== null))];
  if (ids.length === 0) return new Map();

  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, display_name").in("id", ids);

  return new Map(
    (data ?? [])
      .filter((p): p is { id: string; display_name: string } => p.display_name !== null)
      .map((p) => [p.id, p.display_name]),
  );
}

/**
 * Writes an entry to the audit trail.
 *
 * Goes through record_admin_action rather than inserting directly: the table
 * has no insert policy, and the function stamps the actor from the session so
 * an action cannot be recorded against somebody else's name.
 */
export async function recordAdminAction(
  action: AuditAction,
  targetUserId: string,
  detail: Record<string, unknown> = {},
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_admin_action", {
    action,
    target_user_id: targetUserId,
    detail,
  });

  // An action that succeeded but went unrecorded is worth knowing about, but
  // it is not worth failing the action the administrator actually asked for.
  if (error) console.error(`Failed to record "${action}":`, error.message);
}
