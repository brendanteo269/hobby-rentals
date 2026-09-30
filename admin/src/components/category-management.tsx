"use client";

import { useActionState, useMemo, useState } from "react";
import { Badge, Button, Field, FormMessage, Input, Panel, Select } from "@/components/ui";
import { saveCategoryAttributes, type CategoryActionState } from "@/app/categories/actions";
import type { AdminCategory, AttributeDefinition } from "@/lib/category-attributes";

type Draft = Omit<AttributeDefinition, "id" | "category_slug">;
const blank = (): Draft => ({ attribute_key: "", label: "", data_type: "text", is_required: false, options: [], min_val: null, max_val: null, display_order: 0 });
const typeLabels: Record<Draft["data_type"], string> = { text: "Text", number: "Number", select: "Select" };

export function CategoryManagement({ definitions, categories }: { definitions: AttributeDefinition[]; categories: AdminCategory[] }) {
  const [slug, setSlug] = useState(categories[0]?.slug ?? "");
  const [rowsByCategory, setRowsByCategory] = useState<Record<string, Draft[]>>(() => Object.fromEntries(categories.map((category) => [category.slug, definitions.filter((row) => row.category_slug === category.slug).map((row) => ({ attribute_key: row.attribute_key, label: row.label, data_type: row.data_type, is_required: row.is_required, options: row.options, min_val: row.min_val, max_val: row.max_val, display_order: row.display_order }))])));
  const [manualKeys, setManualKeys] = useState<Set<number>>(new Set());
  const [optionDrafts, setOptionDrafts] = useState<Record<number, string>>({});
  const [state, action, pending] = useActionState<CategoryActionState, FormData>(saveCategoryAttributes, undefined);
  const rows = rowsByCategory[slug] ?? [];
  const definitionsForSubmit = rows.map((row, index) => ({ ...row, display_order: (index + 1) * 10 }));
  const count = useMemo(() => Object.fromEntries(categories.map((category) => [category.slug, (rowsByCategory[category.slug] ?? []).length])), [rowsByCategory, categories]);
  const update = (index: number, change: Partial<Draft>) => setRowsByCategory((current) => ({ ...current, [slug]: current[slug].map((row, rowIndex) => rowIndex === index ? { ...row, ...change } : row) }));
  const remove = (index: number) => setRowsByCategory((current) => ({ ...current, [slug]: current[slug].filter((_, rowIndex) => rowIndex !== index) }));
  const move = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= rows.length) return;
    setRowsByCategory((current) => {
      const next = [...current[slug]];
      [next[index], next[destination]] = [next[destination], next[index]];
      return { ...current, [slug]: next };
    });
    setManualKeys(new Set());
  };
  const addOption = (index: number) => {
    const option = (optionDrafts[index] ?? "").trim();
    if (!option || rows[index].options.includes(option)) return;
    update(index, { options: [...rows[index].options, option] });
    setOptionDrafts((current) => ({ ...current, [index]: "" }));
  };

  return <div className="space-y-8">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => <button type="button" key={category.slug} onClick={() => { setSlug(category.slug); setManualKeys(new Set()); }} className={`border p-4 text-left ${slug === category.slug ? "border-ink bg-sand" : "border-line bg-white"}`}><p className="font-medium">{category.label}</p><p className="mt-1 text-sm text-ink-soft">{count[category.slug]} attribute{count[category.slug] === 1 ? "" : "s"}</p></button>)}
    </div>
    <Panel title={`${categories.find((category) => category.slug === slug)?.label} specifications`} description="Changes affect future listings only; saved listing values are never modified.">
      <form action={action} className="space-y-4">
        <input type="hidden" name="category_slug" value={slug} />
        <input type="hidden" name="definitions" value={JSON.stringify(definitionsForSubmit)} />
        {rows.map((row, index) => <section key={`${row.attribute_key}-${index}`} className="mb-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex min-w-0 items-center gap-2"><h3 className="truncate font-medium">{row.label || "New Attribute"}</h3><Badge tone="neutral">{typeLabels[row.data_type]}</Badge></div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={row.is_required} onChange={(event) => update(index, { is_required: event.target.checked })} /> Required on listing creation</label>
              <button type="button" aria-label={`Move ${row.label || "attribute"} up`} disabled={index === 0} onClick={() => move(index, -1)} className="rounded-sm border border-line px-2 py-1 text-sm disabled:opacity-40">↑</button>
              <button type="button" aria-label={`Move ${row.label || "attribute"} down`} disabled={index === rows.length - 1} onClick={() => move(index, 1)} className="rounded-sm border border-line px-2 py-1 text-sm disabled:opacity-40">↓</button>
              <button type="button" aria-label={`Remove ${row.label || "attribute"}`} onClick={() => remove(index)} className="rounded-sm px-2 py-1 text-sm text-bad hover:bg-sand">🗑</button>
            </div>
          </header>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div><Field label="Label" id={`label-${index}`} value={row.label} onChange={(event) => update(index, { label: event.target.value, ...(manualKeys.has(index) ? {} : { attribute_key: slugify(event.target.value) }) })} required />
              <div className="mt-2 flex items-center gap-2 text-xs text-ink-soft">{manualKeys.has(index) ? <Input aria-label="API key" value={row.attribute_key} onChange={(event) => update(index, { attribute_key: slugify(event.target.value) })} className="max-w-xs py-1" /> : <span>API Key: <code>{row.attribute_key || "generated from label"}</code></span>}<button type="button" className="underline" onClick={() => setManualKeys((current) => new Set([...current, index]))}>Edit key</button></div>
            </div>
            <label className="text-sm font-medium">Data type<Select className="mt-2" value={row.data_type} onChange={(event) => update(index, { data_type: event.target.value as Draft["data_type"], options: event.target.value === "select" ? row.options : [] })}><option value="text">Text</option><option value="number">Number</option><option value="select">Select</option></Select></label>
            {row.data_type === "number" && <div className="grid grid-cols-2 gap-3 md:col-span-2"><Field label="Minimum Value" id={`min-${index}`} type="number" value={row.min_val ?? ""} onChange={(event) => update(index, { min_val: event.target.value === "" ? null : Number(event.target.value) })} /><Field label="Maximum Value" id={`max-${index}`} type="number" value={row.max_val ?? ""} onChange={(event) => update(index, { max_val: event.target.value === "" ? null : Number(event.target.value) })} /></div>}
            {row.data_type === "select" && <div className="md:col-span-2"><p className="text-sm font-medium">Options</p><div className="mt-2 flex flex-wrap gap-2">{row.options.map((option) => <span key={option} className="inline-flex items-center gap-1 rounded-full border border-line bg-sand px-3 py-1 text-sm">{option}<button type="button" aria-label={`Remove ${option}`} onClick={() => update(index, { options: row.options.filter((value) => value !== option) })} className="text-ink-soft hover:text-bad">×</button></span>)}{!row.options.length && <span className="text-sm text-ink-soft">No options yet.</span>}</div><div className="mt-3 flex gap-2"><Input aria-label="Add option" placeholder="Add option…" value={optionDrafts[index] ?? ""} onChange={(event) => setOptionDrafts((current) => ({ ...current, [index]: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addOption(index); } }} /><Button type="button" variant="outline" onClick={() => addOption(index)}>Add</Button></div></div>}
          </div>
        </section>)}
        <div className="sticky bottom-0 -mx-6 border-t border-line bg-cream px-6 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]"><div className="flex flex-wrap items-center justify-between gap-3"><Button type="button" variant="outline" onClick={() => setRowsByCategory((current) => ({ ...current, [slug]: [...(current[slug] ?? []), blank()] }))}>+ Add Specification</Button><div className="flex items-center gap-3"><FormMessage state={state} /><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save Specifications"}</Button></div></div></div>
      </form>
    </Panel>
  </div>;
}

function slugify(value: string) { return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""); }
