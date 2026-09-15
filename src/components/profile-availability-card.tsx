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
    <p className="body-copy mt-2">Choose the days your equipment is normally available for rental. Green days are available; outlined days are unavailable. You can set different availability for an individual listing when needed.</p>
    <form action={formAction} className="mt-5">
      <input type="hidden" name="available_days" value={JSON.stringify(days)} />
      <div className="flex flex-wrap gap-2" aria-label="Weekly rental availability">{WEEKDAY_LABELS.map((label, index) => { const day = index + 1; const selected = days.includes(day); return <button type="button" key={label} aria-pressed={selected} onClick={() => toggle(day)} className={`min-w-24 border px-3 py-2 text-sm font-medium transition-colors ${selected ? "border-emerald-800 bg-emerald-700 text-white hover:bg-emerald-800" : "border-line bg-white text-ink-soft hover:border-ink hover:text-ink"}`}><span className="block">{label}</span><span className="mt-0.5 block text-xs font-normal opacity-90">{selected ? "✓ Available" : "Unavailable"}</span></button>; })}</div>
      {state?.error && <p role="alert" className="mt-3 text-sm text-clay">{state.error}</p>}
      {state?.saved && <p className="mt-3 text-sm text-ink-soft">Saved.</p>}
      <Button className="mt-5" type="submit" disabled={pending || days.length === 0}>{pending ? "Saving…" : "Save availability"}</Button>
    </form>
  </section>;
}
