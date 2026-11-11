"use server";

import { revalidatePath } from "next/cache";
import { requirePortalSession } from "@/lib/admin";
import {
  MAX_CORRECTION_CHARS,
  createCorrection,
  parseSlugs,
  promoteGoodAnswers,
  resyncHelpContent,
  updateApprovedAnswer,
} from "@/lib/assistant";
import { ROUTES } from "@/lib/routes";

export type ResyncState = { error?: string; success?: string } | undefined;
export type FormState = { error?: string; success?: string } | undefined;

/** After the help centre changes, so the assistant answers from the new text straight away. */
export async function resyncHelp(): Promise<ResyncState> {
  await requirePortalSession();
  const result = await resyncHelpContent();
  if ("error" in result) return { error: result.error };
  return {
    success: `Help content synced: ${result.chunks} sections, ${result.embedded} updated, ${result.removed} removed.`,
  };
}

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function revalidateAssistant() {
  revalidatePath(ROUTES.assistant);
  revalidatePath(ROUTES.assistantAnswers);
  revalidatePath(ROUTES.assistantFeedback);
}

/** S6-08 Scenario 2: an admin's corrected answer for a thumbs-down question, used by the assistant from now on. */
export async function saveCorrection(_: FormState, form: FormData): Promise<FormState> {
  await requirePortalSession();
  const turnId = text(form, "turn_id");
  const answer = text(form, "answer");
  if (!turnId) return { error: "Missing the answer being corrected." };
  if (!answer) return { error: "Write the corrected answer." };
  if (answer.length > MAX_CORRECTION_CHARS) return { error: `Keep the answer under ${MAX_CORRECTION_CHARS} characters.` };
  const result = await createCorrection(turnId, {
    answer,
    title: text(form, "title") || undefined,
    question: text(form, "question") || undefined,
    related_slugs: parseSlugs(text(form, "related_slugs")),
  });
  if ("error" in result) return { error: result.error };
  revalidateAssistant();
  return { success: "Correction saved. The assistant uses it for questions like this from now on." };
}

/** Edits an approved answer, marks it reviewed, or retires or restores it. */
export async function changeApprovedAnswer(_: FormState, form: FormData): Promise<FormState> {
  await requirePortalSession();
  const id = text(form, "id");
  const intent = text(form, "intent");
  if (!id) return { error: "Missing the answer." };
  let changes: Parameters<typeof updateApprovedAnswer>[1];
  if (intent === "retire") changes = { status: "RETIRED" };
  else if (intent === "restore") changes = { status: "APPROVED" };
  else if (intent === "reviewed") changes = { reviewed: true };
  else {
    const answer = text(form, "answer");
    if (!answer) return { error: "The answer can't be empty." };
    if (answer.length > MAX_CORRECTION_CHARS) return { error: `Keep the answer under ${MAX_CORRECTION_CHARS} characters.` };
    changes = { answer, title: text(form, "title") || undefined, question: text(form, "question") || undefined };
    if (form.has("related_slugs")) changes.related_slugs = parseSlugs(text(form, "related_slugs"));
  }
  const result = await updateApprovedAnswer(id, changes);
  if ("error" in result) return { error: result.error };
  revalidateAssistant();
  const done = { retire: "Retired: the assistant no longer uses it.", restore: "Restored: the assistant uses it again.", reviewed: "Marked as reviewed." };
  return { success: done[intent as keyof typeof done] ?? "Saved." };
}

/** S6-08 Scenario 4: the nightly promotion of well-rated answers, run now. */
export async function runPromotion(): Promise<FormState> {
  await requirePortalSession();
  const result = await promoteGoodAnswers();
  if ("error" in result) return { error: result.error };
  revalidateAssistant();
  return { success: `${result.promoted} new example${result.promoted === 1 ? "" : "s"}, ${result.updated} updated, ${result.retired} retired.` };
}
