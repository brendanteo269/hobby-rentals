"use client";

import { useState } from "react";
import { Button, Input, Select } from "@/components/ui";
import { WEEKDAY_LABELS, type BlackoutRule } from "@/lib/listings";

/**
 * Editor for the dates a listing is unavailable.
 *
 * The rules are held in React state and serialised into one hidden field, so
 * the surrounding form stays a plain `<form action={…}>` and the server action
 * reads a single value instead of reconstructing a variable-length list from
 * indexed field names.
 */
export function BlackoutRulesField({ error }: { error?: string }) {
  const [rules, setRules] = useState<BlackoutRule[]>([]);
  const [draftType, setDraftType] = useState<BlackoutRule["type"]>("DATE_RANGE");

  const addRule = (rule: BlackoutRule) => setRules((current) => [...current, rule]);
  const removeRule = (index: number) =>
    setRules((current) => current.filter((_, i) => i !== index));

  return (
    <fieldset className="border border-line bg-white p-5">
      <legend className="px-2 text-sm font-medium">Blackout dates</legend>
      <p className="body-copy">
        Optional. Days the gear cannot be rented — a trip you are taking it on, or a weekday you
        never hand over.
      </p>

      <input type="hidden" name="blackout_dates" value={JSON.stringify(rules)} />

      {rules.length > 0 && (
        <ul className="mt-4 space-y-2">
          {rules.map((rule, index) => (
            <li
              key={`${rule.type}-${index}`}
              className="flex items-center justify-between gap-3 border border-line px-3 py-2 text-sm"
            >
              <span>{describeRule(rule)}</span>
              <button
                type="button"
                onClick={() => removeRule(index)}
                className="text-sm text-ink-soft underline underline-offset-4 transition-colors hover:text-ink"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 border-t border-line pt-4">
        <label htmlFor="blackout_type" className="block text-sm font-medium">
          Add a blackout
        </label>
        <Select
          id="blackout_type"
          value={draftType}
          onChange={(event) => setDraftType(event.target.value as BlackoutRule["type"])}
          className="mt-2 max-w-xs"
        >
          <option value="DATE_RANGE">Specific dates</option>
          <option value="WEEKLY">Every week</option>
          <option value="ANNUAL">Every year</option>
        </Select>

        <div className="mt-3">
          {draftType === "DATE_RANGE" && <DateRangeDraft onAdd={addRule} />}
          {draftType === "WEEKLY" && <WeeklyDraft onAdd={addRule} />}
          {draftType === "ANNUAL" && <AnnualDraft onAdd={addRule} />}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-xs text-clay">
          {error}
        </p>
      )}
    </fieldset>
  );
}

type DraftProps = { onAdd: (rule: BlackoutRule) => void };

function DateRangeDraft({ onAdd }: DraftProps) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const valid = start !== "" && end !== "" && end >= start;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <DraftInput label="From" value={start} onChange={setStart} type="date" />
      <DraftInput label="Until" value={end} onChange={setEnd} type="date" min={start || undefined} />
      <AddButton
        disabled={!valid}
        onClick={() => {
          onAdd({ type: "DATE_RANGE", start, end });
          setStart("");
          setEnd("");
        }}
      />
    </div>
  );
}

function WeeklyDraft({ onAdd }: DraftProps) {
  const [weekdays, setWeekdays] = useState<number[]>([]);

  const toggle = (day: number) =>
    setWeekdays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day],
    );

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <span className="block text-sm font-medium">Repeats on</span>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {WEEKDAY_LABELS.map((label, day) => (
            <label
              key={label}
              className="cursor-pointer border border-line px-3 py-2 text-xs transition-colors hover:border-ink has-checked:border-ink has-checked:bg-sand"
            >
              <input
                type="checkbox"
                checked={weekdays.includes(day)}
                onChange={() => toggle(day)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
      </div>
      <AddButton
        disabled={weekdays.length === 0}
        onClick={() => {
          // Sorted so "Sat, Sun" reads in week order however they were clicked.
          onAdd({ type: "WEEKLY", weekdays: [...weekdays].sort((a, b) => a - b) });
          setWeekdays([]);
        }}
      />
    </div>
  );
}

/**
 * An annual rule stores month and day only, so the backend can apply it to
 * every year. The inputs collect a full date because a month/day picker is not
 * a native control; the year is dropped on the way out.
 */
function AnnualDraft({ onAdd }: DraftProps) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const valid = start !== "" && end !== "";

  return (
    <div className="flex flex-wrap items-end gap-3">
      <DraftInput label="From" value={start} onChange={setStart} type="date" />
      <DraftInput label="Until" value={end} onChange={setEnd} type="date" />
      <p className="body-copy w-full max-w-xs">
        Only the day and month are kept, so this repeats every year. A range may cross new year.
      </p>
      <AddButton
        disabled={!valid}
        onClick={() => {
          onAdd({
            type: "ANNUAL",
            start_month_day: monthDay(start),
            end_month_day: monthDay(end),
          });
          setStart("");
          setEnd("");
        }}
      />
    </div>
  );
}

function DraftInput({
  label,
  value,
  onChange,
  type,
  min,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type: string;
  min?: string;
}) {
  return (
    <div className="min-w-40">
      <label className="block text-sm font-medium">
        {label}
        <Input
          type={type}
          value={value}
          min={min}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2"
        />
      </label>
    </div>
  );
}

function AddButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <Button type="button" variant="outline" disabled={disabled} onClick={onClick}>
      Add
    </Button>
  );
}

/** "2026-12-24" → "12-24", the MM-DD the backend stores for annual rules. */
function monthDay(isoDate: string): string {
  return isoDate.slice(5);
}

function describeRule(rule: BlackoutRule): string {
  switch (rule.type) {
    case "DATE_RANGE":
      return `${rule.start} to ${rule.end}`;
    case "WEEKLY":
      return `Every ${rule.weekdays.map((day) => WEEKDAY_LABELS[day]).join(", ")}`;
    case "ANNUAL":
      return `${rule.start_month_day} to ${rule.end_month_day}, every year`;
  }
}
