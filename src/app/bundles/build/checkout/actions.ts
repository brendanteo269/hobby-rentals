"use server";

import { revalidatePath } from "next/cache";
import { createKit, KitApiError, quoteKit } from "@/lib/api/booking-groups";
import type { CreateKitRequest, KitItemRequest, KitQuote } from "@/lib/booking-groups";

/** Why a bundle could not be priced or requested, for the checkout to act on. */
type KitFailureResult = { error: string; code?: string; shortfallCents?: number; listingId?: string };

export type QuoteKitResult = KitFailureResult | { quote: KitQuote };
export type RequestKitResult = KitFailureResult | { kitId: string };

function failure(error: unknown): KitFailureResult {
  if (error instanceof KitApiError) {
    return { error: error.message, code: error.code, shortfallCents: error.shortfallCents, listingId: error.listingId };
  }
  throw error;
}

/** S5-09 Scenario 1: the bundle priced as it would be booked, grouped by owner. */
export async function quoteKitAction(request: {
  start_date: string;
  end_date: string;
  items: KitItemRequest[];
}): Promise<QuoteKitResult> {
  try {
    return { quote: await quoteKit(request) };
  } catch (error) {
    return failure(error);
  }
}

/** S5-09 Scenario 2: one submit, one request per owner, every hold placed together or none. */
export async function requestKitAction(request: CreateKitRequest): Promise<RequestKitResult> {
  try {
    const kit = await createKit(request);
    // The layout too: every request notifies the renter, so the unread count moves.
    revalidatePath("/", "layout");
    return { kitId: kit.id };
  } catch (error) {
    return failure(error);
  }
}
