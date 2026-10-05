"use client";

import { Modal } from "@/components/ui";
import { BookingRequestForm } from "@/components/bookings/booking-request-form";
import type { Booking } from "@/lib/bookings";
import type { UnavailableDate } from "@/lib/listings";

/** BookingRequestForm, as a modal - the way to request a booking from inside an enquiry chat without leaving it. */
export function BookingRequestModal({
  listingId,
  availableDates,
  unavailableDates,
  minRentalDays,
  maxRentalDays,
  onClose,
  onSuccess,
}: {
  listingId: string;
  availableDates: string[];
  unavailableDates: UnavailableDate[];
  minRentalDays: number | null;
  maxRentalDays: number | null;
  onClose: () => void;
  onSuccess: (booking: Booking) => void;
}) {
  return (
    <Modal title="Request to book" onClose={onClose}>
      <BookingRequestForm
        listingId={listingId}
        availableDates={availableDates}
        unavailableDates={unavailableDates}
        minRentalDays={minRentalDays}
        maxRentalDays={maxRentalDays}
        hideHeading
        onSuccess={(booking) => {
          onSuccess(booking);
          onClose();
        }}
      />
    </Modal>
  );
}
