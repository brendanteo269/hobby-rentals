"use server";

import { revalidatePath } from "next/cache";
import { createSavedSearch, deleteSavedSearch, SavedSearchApiError } from "@/lib/api/saved-searches";
import { RENTALS_PATH, SAVED_SEARCHES_PATH } from "@/lib/routes";

export async function saveSearch(criteria: unknown) {
  try {
    const result = await createSavedSearch(criteria);
    revalidatePath(SAVED_SEARCHES_PATH);
    return result;
  } catch (error) {
    if (error instanceof SavedSearchApiError) return { error: error.message };
    throw error;
  }
}

export async function removeSavedSearch(id: string) {
  try {
    await deleteSavedSearch(id);
    revalidatePath(SAVED_SEARCHES_PATH); revalidatePath(RENTALS_PATH);
    return { success: true };
  } catch (error) {
    if (error instanceof SavedSearchApiError) return { error: error.message };
    throw error;
  }
}
