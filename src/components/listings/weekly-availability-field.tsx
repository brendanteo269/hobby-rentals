"use client";

import { useState } from "react";
import { WEEKDAY_LABELS } from "@/lib/listings";

export function WeeklyAvailabilityField({ profileAvailableDays }: { profileAvailableDays: number[] }) {
  const [custom, setCustom] = useState(false);
  // A custom schedule starts from the owner's current default. This makes
  // switching modes predictable instead of silently reverting to Mon–Fri.
  const [days, setDays] = useState<number[]>(profileAvailableDays);
  const toggle = (day: number) => setDays((current) => current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort());
  return <fieldset className="border border-line bg-white p-5">
    <legend className="px-2 text-sm font-medium">Weekly rental availability</legend>
    <input type="hidden" name="has_custom_availability" value={String(custom)} />
    <input type="hidden" name="custom_available_days" value={JSON.stringify(days)} />
    <label className="mt-2 flex gap-2 text-sm"><input type="radio" checked={!custom} onChange={() => setCustom(false)} /> Use profile default availability</label>
    <label className="mt-3 flex gap-2 text-sm"><input type="radio" checked={custom} onChange={() => setCustom(true)} /> Custom schedule for this listing</label>
    {custom && <div className="mt-4 flex flex-wrap gap-2">{WEEKDAY_LABELS.map((label, index) => { const day = index + 1; const selected = days.includes(day); return <button key={label} type="button" aria-pressed={selected} onClick={() => toggle(day)} className={`border px-3 py-2 text-sm ${selected ? "border-ink bg-sand" : "border-line"}`}>{label}</button>; })}</div>}
  </fieldset>;
}
