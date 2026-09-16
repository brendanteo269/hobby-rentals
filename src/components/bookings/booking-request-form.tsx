"use client";

import { useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";
import { requestBooking } from "@/app/bookings/actions";
import { formatDate } from "@/lib/format";

function isoInDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  // Date inputs represent the member's calendar day, not a UTC timestamp.
  // toISOString() would turn an early-morning Singapore date into yesterday.
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function BookingRequestForm({ listingId }: { listingId: string }) {
  const [startDate, setStartDate] = useState(isoInDays(1));
  const [endDate, setEndDate] = useState(isoInDays(3));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await requestBooking(listingId, startDate, endDate);
      if ("error" in result) setError(result.error);
      else setMessage(`Request sent for ${formatDate(startDate)} – ${formatDate(endDate)}.`);
    });
  }

  return (
    <div className="mt-8 border-t border-line pt-6">
      <h2 className="text-base font-semibold uppercase tracking-wide">Request to book</h2>
      <p className="body-copy mt-1">Choose dates. Nothing is charged in this demo flow until the owner confirms.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">From<Input className="mt-2" type="date" value={startDate} min={isoInDays(0)} onChange={(event) => setStartDate(event.target.value)} /></label>
        <label className="text-sm font-medium">Until<Input className="mt-2" type="date" value={endDate} min={startDate || isoInDays(0)} onChange={(event) => setEndDate(event.target.value)} /></label>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-accent-dark">{error}</p>}
      {message && <p role="status" className="mt-3 text-sm text-ink-soft">{message}</p>}
      <Button className="mt-4" disabled={isPending} onClick={submit}>{isPending ? "Sending…" : "Request booking"}</Button>
    </div>
  );
}
