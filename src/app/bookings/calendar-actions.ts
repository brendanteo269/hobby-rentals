"use server";

import { getBookingCalendar, getMeetupCalendar, type BookingCalendar } from "@/lib/api/bookings";
import { BackendApiError } from "@/lib/api/client";

export type BookingCalendarResult = { error: string } | { calendar: BookingCalendar };

/** S4-16: the backend only answers for a party to the booking, and only while it is confirmed and has not ended. */
export async function fetchBookingCalendar(kind: "single" | "bundle", bookingId: string): Promise<BookingCalendarResult> {
  try {
    return { calendar: await getBookingCalendar(kind, bookingId) };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
}

/** S4-16: the agreed meetup, which both the owner and the renter of the booking may add. */
export async function fetchMeetupCalendar(bookingId: string): Promise<BookingCalendarResult> {
  try {
    return { calendar: await getMeetupCalendar(bookingId) };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
}
