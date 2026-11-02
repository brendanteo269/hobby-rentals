"use server";

import { requirePortalSession } from "@/lib/admin";
import { resyncHelpContent } from "@/lib/assistant";

export type ResyncState = { error?: string; success?: string } | undefined;

/** After the help centre changes, so the assistant answers from the new text straight away. */
export async function resyncHelp(): Promise<ResyncState> {
  await requirePortalSession();
  const result = await resyncHelpContent();
  if ("error" in result) return { error: result.error };
  return {
    success: `Help content synced: ${result.chunks} sections, ${result.embedded} updated, ${result.removed} removed.`,
  };
}
