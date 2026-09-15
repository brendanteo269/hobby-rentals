"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui";
import { WEEKDAY_LABELS } from "@/lib/listings";

type State = { error?: string; saved?: boolean } | undefined;

export function ProfileAvailabilityCard({ availableDays, action }: { availableDays: number[]; action: (state: State, formData: FormData) => Promise<State> }) {
  const [days, setDays] = useState(availableDays);
  const [state, formAction, pending] = useActionState(action, undefined);
  const toggle = (day: number) => setDays((current) => current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort());
  return <section className="border border-line bg-white p-6">
    <h2 className="display-caps text-lg">General rental availability</h2>
    <p className="body-copy mt-2">Choose the days your equipment is normally available for rental. You can set different availability for an individual listing when needed.</p>
    <form action={formAction} className="mt-5">
      <input type="hidden" name="available_days" value={JSON.stringify(days)} />
      <div className="flex flex-wrap gap-2">{WEEKDAY_LABELS.map((label, index) => { const day = index + 1; const selected = days.includes(day); return <button type="button" key={label} aria-pressed={selected} onClick={() => toggle(day)} className={`border px-3 py-2 text-sm ${selected ? "border-ink bg-sand" : "border-line"}`}>{label}</button>; })}</div>
      {state?.error && <p role="alert" className="mt-3 text-sm text-clay">{state.error}</p>}
      {state?.saved && <p className="mt-3 text-sm text-ink-soft">Saved.</p>}
      <Button className="mt-5" type="submit" disabled={pending || days.length === 0}>{pending ? "Saving…" : "Save availability"}</Button>
    </form>
  </section>;
}
