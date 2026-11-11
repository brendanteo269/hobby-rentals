"use server";

import { getBookingReceipt } from "@/lib/api/bookings";
import { BackendApiError, type BackendFile } from "@/lib/api/client";

export type BookingReceiptResult = { error: string } | { receipt: BackendFile };

/** S6-10: the backend only answers for a party to the booking, and only once it is confirmed. */
export async function fetchBookingReceipt(kind: "single" | "bundle", bookingId: string): Promise<BookingReceiptResult> {
  try {
    return { receipt: await getBookingReceipt(kind, bookingId) };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
}
