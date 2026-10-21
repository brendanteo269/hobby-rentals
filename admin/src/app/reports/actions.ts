"use server";

import { revalidatePath } from "next/cache";
import { requirePortalSession } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReopenState = { error?: string; success?: string } | undefined;

/** The database prefixes the refusals the UI cares about with a code ("NOT_REOPENABLE: …"); the code is for the database, not the admin. */
const ERROR_CODE_PREFIX = /^[A-Z_]+: /;

/**
 * An administrator reopens a report the AI dismissed, so a person decides it.
 * Only an AI dismissal can be reopened, and a comment is required; the
 * database writes the audit entry. Shared by the listing and the user pages,
 * since the report can be on either, so the whole layout is revalidated rather
 * than guessing which.
 */
export async function reopenAiDismissal(_prev: ReopenState, formData: FormData): Promise<ReopenState> {
  await requirePortalSession();

  const reportId = String(formData.get("report_id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!note) return { error: "A comment is required." };

  const { error } = await createAdminClient().rpc("admin_reopen_ai_dismissal", { p_report_id: reportId, p_note: note });
  if (error) return { error: error.message.replace(ERROR_CODE_PREFIX, "") };

  revalidatePath("/", "layout");
  return { success: "Report reopened. It is back in the queue for a person to decide." };
}
