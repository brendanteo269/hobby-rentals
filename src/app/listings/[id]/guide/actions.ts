"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BackendApiError } from "@/lib/api/client";
import { deleteOwnerGuide, saveOwnerGuide } from "@/lib/api/guides";
import { MAX_GUIDE_NOTES_CHARS, MAX_GUIDE_STEP_CHARS, MAX_GUIDE_STEPS } from "@/lib/guides";
import { listingGuidePath } from "@/lib/routes";

export type GuideFormState =
  | {
      /** The form's overall outcome, shown above the save button. */
      error?: string;
      /** Keyed as the API keys them: "safety_tips", "return_notes", "steps.2.text". */
      fieldErrors?: Record<string, string>;
      /** Set once saved: when, as the guide's own updated_at. */
      savedAt?: string;
    }
  | undefined;

function optionalText(formData: FormData, name: string): string | null {
  const value = String(formData.get(name) ?? "").trim();
  return value || null;
}

/**
 * Scenario 1: saves the whole guide. The steps arrive as steps.N.text and
 * steps.N.photo_key in display order. The same limits are checked here for a
 * quick answer; the API re-checks them, and alone checks photo ownership and
 * contact details, so its field errors are passed through under the same keys.
 */
export async function saveGuide(listingId: string, _previous: GuideFormState, formData: FormData): Promise<GuideFormState> {
  const steps: { text: string; photo_key: string | null }[] = [];
  for (let index = 0; index < MAX_GUIDE_STEPS && formData.has(`steps.${index}.text`); index += 1) {
    steps.push({
      text: String(formData.get(`steps.${index}.text`) ?? "").trim(),
      photo_key: optionalText(formData, `steps.${index}.photo_key`),
    });
  }
  const guide = {
    safety_tips: optionalText(formData, "safety_tips"),
    return_notes: optionalText(formData, "return_notes"),
    steps,
  };

  const fieldErrors: Record<string, string> = {};
  if (steps.length === 0) fieldErrors.steps = "Add at least one step.";
  steps.forEach((step, index) => {
    if (!step.text) fieldErrors[`steps.${index}.text`] = `Step ${index + 1} needs some text.`;
    else if (step.text.length > MAX_GUIDE_STEP_CHARS) fieldErrors[`steps.${index}.text`] = `Keep step ${index + 1} to ${MAX_GUIDE_STEP_CHARS} characters.`;
  });
  for (const [field, label] of [["safety_tips", "safety tips"], ["return_notes", "packing notes"]] as const) {
    if ((guide[field]?.length ?? 0) > MAX_GUIDE_NOTES_CHARS) fieldErrors[field] = `Keep your ${label} to ${MAX_GUIDE_NOTES_CHARS} characters.`;
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  try {
    const saved = await saveOwnerGuide(listingId, guide);
    // The listing's badge, and this page's delete control once a first guide exists.
    revalidatePath(`/listings/${listingId}`);
    revalidatePath(listingGuidePath(listingId));
    return { savedAt: saved.guide?.updated_at };
  } catch (caught) {
    if (caught instanceof BackendApiError) {
      return Object.keys(caught.fieldErrors).length > 0 ? { fieldErrors: caught.fieldErrors } : { error: caught.message };
    }
    throw caught;
  }
}

export type DeleteGuideState = { error?: string } | undefined;

/** Deletes the guide and returns the owner to the listing. Refused (409) while a renter relies on it. */
export async function deleteGuide(listingId: string): Promise<DeleteGuideState> {
  try {
    await deleteOwnerGuide(listingId);
  } catch (caught) {
    if (caught instanceof BackendApiError) return { error: caught.message };
    throw caught;
  }
  revalidatePath(`/listings/${listingId}`);
  revalidatePath(listingGuidePath(listingId));
  redirect(`/listings/${listingId}`);
}
