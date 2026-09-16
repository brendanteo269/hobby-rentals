"use client";

import { useActionState, useCallback, useState } from "react";
import { Button, Chip } from "@/components/ui";
import { WEEKDAY_LABELS } from "@/lib/listings";
import { useToast } from "@/components/toast";

type State = { error?: string; saved?: boolean } | undefined;

export function ProfileAvailabilityCard({
  availableDays,
  action,
}: {
  availableDays: number[];
  action: (state: State, formData: FormData) => Promise<State>;
}) {
  const [days, setDays] = useState(availableDays);
  const { show, dismiss } = useToast();
  const saveAvailability = useCallback(
    async (previousState: State, formData: FormData): Promise<State> => {
      const loadingToast = show("Saving availability…", "loading");
      try {
        const result = await action(previousState, formData);
        if (result?.error) show(result.error, "error");
        else if (result?.saved) show("Availability saved.", "success");
        return result;
      } catch {
        const result = { error: "We could not save your availability. Please try again." };
        show(result.error, "error");
        return result;
      } finally {
        dismiss(loadingToast);
      }
    },
    [action, dismiss, show],
  );
  const [, formAction, pending] = useActionState(saveAvailability, undefined);
  const toggle = (day: number) =>
    setDays((current) => (current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort()));

  return (
    <section className="card p-6">
      <h2 className="heading text-lg">General rental availability</h2>
      <p className="body-copy mt-2">
        Choose the days your equipment is normally available for rental. You can set different
        availability for an individual listing when needed.
      </p>
      <form action={formAction} className="mt-5">
        <input type="hidden" name="available_days" value={JSON.stringify(days)} />
        <div className="flex flex-wrap gap-2" aria-label="Weekly rental availability">
          {WEEKDAY_LABELS.map((label, index) => {
            const day = index + 1;
            const selected = days.includes(day);
            return (
              <Chip key={label} selected={selected} onClick={() => toggle(day)} className="min-w-24 flex-col gap-0">
                <span className="block">{label}</span>
                <span className="mt-0.5 block text-xs font-normal opacity-90">
                  {selected ? "✓ Available" : "Unavailable"}
                </span>
              </Chip>
            );
          })}
        </div>
        <Button className="mt-5" type="submit" disabled={pending || days.length === 0}>
          {pending ? "Saving…" : "Save availability"}
        </Button>
      </form>
    </section>
  );
}
