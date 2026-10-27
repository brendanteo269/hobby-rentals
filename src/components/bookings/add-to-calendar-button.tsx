"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { CalendarClock, CalendarDays, CalendarPlus, ChevronDown } from "lucide-react";
import { fetchBookingCalendar, fetchMeetupCalendar } from "@/app/bookings/calendar-actions";
import { useToast } from "@/components/toast";
import { useDismiss } from "@/components/use-dismiss";
import { canAddMeetupToCalendar, canAddToCalendar } from "@/lib/calendar-export";

type CalendarBooking = { id: string; status: string; end_date: string; confirmed_meetup_time?: string | null };
type CalendarOption = "meetup" | "rental";

const OPTION_LABELS: Record<CalendarOption, { menu: string; hint: string }> = {
  meetup: { menu: "Add meetup to calendar", hint: "Agreed time and place" },
  rental: { menu: "Add rental dates to calendar", hint: "All-day event for the booking" },
};

/**
 * S4-16: one calendar icon for a booking, whose contents depend on where the
 * booking is. A confirmed booking that has not ended offers its dates as an
 * all-day event ("rental"); once a meetup is agreed and still to come, that is
 * offered too, at its time and place ("meetup"). With one option the icon
 * downloads it directly; with both it opens a small menu of what can be added.
 * It is labelled "Add to calendar" so its purpose is plain. With neither (not
 * confirmed, or over) nothing renders. Each choice downloads an .ics file the
 * member's calendar app adds as an event.
 */
export function AddToCalendarButton({
  kind = "single",
  booking,
  className = "",
  menuAlign = "left",
}: {
  kind?: "single" | "bundle";
  booking: CalendarBooking;
  className?: string;
  /** Which edge of the button the menu lines up with. */
  menuAlign?: "left" | "right";
}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const { show } = useToast();
  useDismiss(rootRef, open, close);

  const options: CalendarOption[] = [
    ...(canAddMeetupToCalendar(booking) ? (["meetup"] as const) : []),
    ...(canAddToCalendar(booking) ? (["rental"] as const) : []),
  ];
  if (options.length === 0) return null;

  function download(option: CalendarOption) {
    close();
    startTransition(async () => {
      const result = option === "meetup" ? await fetchMeetupCalendar(booking.id) : await fetchBookingCalendar(kind, booking.id);
      if ("error" in result) {
        show(result.error, "error");
        return;
      }
      const url = URL.createObjectURL(new Blob([result.calendar.ics], { type: "text/calendar;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = result.calendar.filename;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  const single = options.length === 1 ? options[0] : null;
  const label = single ? OPTION_LABELS[single].menu : "Add to calendar";

  return (
    <div ref={rootRef} className={`relative w-fit ${className}`}>
      <button
        type="button"
        onClick={() => (single ? download(single) : setOpen((current) => !current))}
        disabled={isPending}
        aria-label={label}
        title={label}
        aria-haspopup={single ? undefined : "menu"}
        aria-expanded={single ? undefined : open}
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink outline-none transition-colors hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
      >
        <CalendarPlus className={`size-4 ${isPending ? "animate-pulse" : ""}`} aria-hidden="true" />
        {isPending ? "Preparing…" : "Add to calendar"}
        {!single && <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />}
      </button>

      {open && !single && (
        <div
          role="menu"
          className={`absolute top-full z-30 mt-2 w-64 overflow-hidden rounded-xl border border-line bg-white p-1 text-left shadow-lg ${menuAlign === "right" ? "right-0" : "left-0"}`}
        >
          {options.map((option) => {
            const Icon = option === "meetup" ? CalendarClock : CalendarDays;
            return (
              <button
                key={option}
                type="button"
                role="menuitem"
                onClick={() => download(option)}
                className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-surface-muted"
              >
                <Icon className="mt-0.5 size-4 shrink-0 text-ink-soft" aria-hidden="true" />
                <span>
                  <span className="block font-medium">{OPTION_LABELS[option].menu}</span>
                  <span className="block text-xs text-ink-soft">{OPTION_LABELS[option].hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
