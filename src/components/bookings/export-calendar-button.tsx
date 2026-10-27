"use client";

import { useTransition } from "react";
import { CalendarDays } from "lucide-react";
import { exportCalendar } from "@/app/bookings/calendar-actions";
import { Button } from "@/components/ui";
import { useToast } from "@/components/toast";
import { calendarOutcome } from "@/lib/calendar-export";

/** S4-16: downloads the member's confirmed rentals as an .ics file, or says there are none. */
export function ExportCalendarButton({ role }: { role: "owner" | "renter" }) {
  const [isPending, startTransition] = useTransition();
  const { show } = useToast();

  function download() {
    startTransition(async () => {
      const result = await exportCalendar(role);
      if ("error" in result) {
        show(result.error, "error");
        return;
      }
      const outcome = calendarOutcome(result.export);
      if (outcome.kind === "empty") {
        show(outcome.message, "info");
        return;
      }
      const url = URL.createObjectURL(new Blob([outcome.ics], { type: "text/calendar;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = outcome.filename;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <Button type="button" variant="outline" onClick={download} disabled={isPending} className="px-4 py-2 text-xs">
      <CalendarDays className="size-4" aria-hidden="true" />
      {isPending ? "Preparing…" : "Export calendar"}
    </Button>
  );
}
