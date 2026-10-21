"use server";

import { revalidatePath } from "next/cache";
import { requirePortalSession } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROUTES } from "@/lib/routes";

export type DecideReportState = { error?: string; success?: string } | undefined;

/** The database prefixes the refusals the UI cares about with a code ("ALREADY_DECIDED: …"); the code is for the database, not the admin. */
const ERROR_CODE_PREFIX = /^[A-Z_]+: /;

const DECISION_BY_INTENT = { uphold: "UPHOLD", dismiss: "DISMISS" } as const;

const SUCCESS_BY_INTENT = {
  uphold: "Report upheld. The reported user has been sent it, and the reporter has been told.",
  dismiss: "Report dismissed. The reporter has been told; the reported user was not.",
} as const;

/**
 * An administrator's decision on a user report (S3-22). The database function
 * does the work atomically - closes the report, sends it to the reported user
 * only if upheld, tells the reporter, and writes the audit entry - so this
 * action only parses the form and passes a refusal through.
 */
export async function decideUserReport(_prev: DecideReportState, formData: FormData): Promise<DecideReportState> {
  await requirePortalSession();

  const reportId = String(formData.get("report_id") ?? "");
  const intent = String(formData.get("intent") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (intent !== "uphold" && intent !== "dismiss") return { error: "Choose whether to uphold or dismiss the report." };
  if (!note) return { error: "A reason is required." };

  const { error } = await createAdminClient().rpc("admin_resolve_user_report", {
    p_report_id: reportId,
    p_decision: DECISION_BY_INTENT[intent],
    p_note: note,
  });
  if (error) return { error: error.message.replace(ERROR_CODE_PREFIX, "") };

  revalidatePath(ROUTES.report(reportId));
  revalidatePath(ROUTES.reports);
  return { success: SUCCESS_BY_INTENT[intent] };
}
