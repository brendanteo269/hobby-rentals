"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";

export type BlackoutDateDraft = { start_date: string; end_date: string; reason?: string };

/** One-off calendar exceptions only. Weekly availability is edited separately. */
export function BlackoutRulesField({ error }: { error?: string }) {
  const [blackouts, setBlackouts] = useState<BlackoutDateDraft[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const valid = Boolean(start && end && end >= start);

  return (
    <fieldset className="border border-line bg-white p-5">
      <legend className="px-2 text-sm font-medium">Blackout dates</legend>
      <p className="body-copy">Optional calendar exceptions, such as a holiday or maintenance period.</p>
      <input type="hidden" name="initial_blackouts" value={JSON.stringify(blackouts)} />
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="min-w-40 text-sm font-medium">Start date<Input className="mt-2" type="date" value={start} onChange={(event) => setStart(event.target.value)} /></label>
        <label className="min-w-40 text-sm font-medium">End date<Input className="mt-2" type="date" min={start || undefined} value={end} onChange={(event) => setEnd(event.target.value)} /></label>
        <Button type="button" variant="outline" disabled={!valid} onClick={() => { setBlackouts((current) => [...current, { start_date: start, end_date: end }]); setStart(""); setEnd(""); }}>Add blackout</Button>
      </div>
      {blackouts.length > 0 && <ul className="mt-4 flex flex-wrap gap-2">{blackouts.map((blackout, index) => <li key={`${blackout.start_date}-${blackout.end_date}-${index}`} className="flex items-center gap-2 border border-line px-3 py-2 text-sm"><span>{blackout.start_date} to {blackout.end_date}</span><button type="button" className="underline" onClick={() => setBlackouts((current) => current.filter((_, i) => i !== index))}>Remove</button></li>)}</ul>}
      {error && <p role="alert" className="mt-3 text-xs text-clay">{error}</p>}
    </fieldset>
  );
}
