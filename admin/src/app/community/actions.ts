"use server";

import { revalidatePath } from "next/cache";
import { requirePortalSession } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROUTES } from "@/lib/routes";

export type ForumDecisionState = { error?: string; success?: string } | undefined;

const ERROR_CODE_PREFIX = /^[A-Z_]+: /;

/**
 * S6-11 Scenario 6: remove the reported post or comment (every open report on
 * it is actioned and the author is told the reason) or dismiss this report.
 * The reason is required either way; the database enforces it.
 */
export async function decideForumReport(_prev: ForumDecisionState, formData: FormData): Promise<ForumDecisionState> {
  await requirePortalSession();
  const reportId = String(formData.get("report_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!note) return { error: "Say why, for the record and for the author." };

  const { error } = await createAdminClient().rpc("admin_resolve_forum_report", {
    p_report_id: reportId, p_decision: decision, p_note: note,
  });
  if (error) return { error: error.message.replace(ERROR_CODE_PREFIX, "") };

  revalidatePath(ROUTES.community);
  return { success: decision === "REMOVE" ? "Removed. The author has been told why." : "Report dismissed." };
}
