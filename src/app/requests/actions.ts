"use server";

import { revalidatePath } from "next/cache";
import { BackendApiError } from "@/lib/api/client";
import {
  closeGearRequest,
  offerListingOnGearRequest,
  postGearRequest,
} from "@/lib/api/gear-requests";
import type { GearRequest, GearRequestOffer } from "@/lib/gear-requests";

/**
 * Anything that is not the backend refusing us - a network blip, a bad
 * response shape, a bug in here. Rethrowing would leave the member looking
 * at a button that did nothing at all, so each action turns it into a
 * message and leaves the real cause in the server log.
 */
function unexpected(error: unknown, what: string): { error: string } {
  console.error(`Gear request: ${what} failed`, error);
  return { error: "Something went wrong. Try again in a moment." };
}

export type PostRequestResult = { error: string } | { request: GearRequest };
export type OfferResult = { error: string } | { offer: GearRequestOffer };
export type CloseResult = { error: string } | { request: GearRequest };

/**
 * S5-13 Scenario 1. Revalidates the layout as well as the board: posting a
 * request notifies matching owners, so the header's unread count is part of
 * what changed for them, and the renter's own board entry for everyone else.
 */
export async function postRequest(formData: FormData): Promise<PostRequestResult> {
  const price = Number(formData.get("max_daily_price") ?? "");
  if (!Number.isFinite(price) || price < 0) {
    return { error: "Enter the most you would pay per day." };
  }
  try {
    const request = await postGearRequest({
      title: String(formData.get("title") ?? "").trim(),
      details: String(formData.get("details") ?? "").trim() || null,
      start_date: String(formData.get("start_date") ?? ""),
      end_date: String(formData.get("end_date") ?? ""),
      max_daily_price_cents: Math.round(price * 100),
    });
    revalidatePath("/", "layout");
    return { request };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    return unexpected(error, "posting a request");
  }
}

/** S5-13 Scenario 3: offer one of your listings, archived ones included. */
export async function offerListing(
  requestId: string,
  listingId: string,
  message: string,
): Promise<OfferResult> {
  try {
    const offer = await offerListingOnGearRequest(requestId, listingId, message);
    revalidatePath("/", "layout");
    return { offer };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    return unexpected(error, "offering a listing");
  }
}

/** S5-13 Scenario 4: take it off the board; owners can no longer offer on it. */
export async function closeRequest(requestId: string): Promise<CloseResult> {
  try {
    const request = await closeGearRequest(requestId);
    revalidatePath("/", "layout");
    return { request };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    return unexpected(error, "closing a request");
  }
}
