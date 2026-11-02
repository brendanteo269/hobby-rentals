"use server";

import { revalidatePath } from "next/cache";
import { BackendApiError } from "@/lib/api/client";
import { endAway, previewAway, saveAway, type AwaySaveResult } from "@/lib/api/away";
import type { AwayClash } from "@/lib/away";
import { MY_LISTINGS_PATH } from "@/lib/routes";

export type AwayPreviewResult = { error: string } | { clashes: AwayClash[] };
export type AwaySaveActionResult = { error: string; clashesChanged?: boolean } | { saved: AwaySaveResult };
export type AwayEndResult = { error: string } | { ended: true };

/** A field's own message when FastAPI named one (the message length), else the summary. */
function messageOf(error: BackendApiError): string {
  return Object.values(error.fieldErrors)[0] ?? error.message;
}

/** Every Owner Portal page shows the away banner, so the whole section re-renders. */
function revalidateOwnerPortal() {
  revalidatePath(MY_LISTINGS_PATH, "layout");
}

export async function previewAwayClashes(startDate: string, endDate: string): Promise<AwayPreviewResult> {
  try {
    return { clashes: (await previewAway(startDate, endDate)).clashes };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: messageOf(error) };
    throw error;
  }
}

/**
 * `clashesChanged` tells the card to preview again and put the new list in
 * front of the owner, rather than show an error they can do nothing with.
 */
export async function saveAwayMode(input: {
  startDate: string;
  endDate: string;
  message: string;
  acknowledgedIds: string[];
  declineIds: string[];
}): Promise<AwaySaveActionResult> {
  try {
    const saved = await saveAway({
      start_date: input.startDate,
      end_date: input.endDate,
      message: input.message,
      acknowledged_ids: input.acknowledgedIds,
      decline_ids: input.declineIds,
    });
    revalidateOwnerPortal();
    return { saved };
  } catch (error) {
    if (error instanceof BackendApiError) {
      return { error: messageOf(error), clashesChanged: error.code === "CLASHES_CHANGED" };
    }
    throw error;
  }
}

export async function endAwayMode(): Promise<AwayEndResult> {
  try {
    await endAway();
    revalidateOwnerPortal();
    return { ended: true };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
}
