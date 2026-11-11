"use server";

import { photoSearch, ListingApiError, type PhotoQuery } from "@/lib/api/listings";

/** S6-03: asks the API what a photo shows. The photo is passed through, never stored. */
export async function searchByPhoto(imageBase64: string): Promise<{ error: string } | { result: PhotoQuery }> {
  try {
    return { result: await photoSearch(imageBase64) };
  } catch (error) {
    if (error instanceof ListingApiError) return { error: error.message };
    throw error;
  }
}
