"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { Badge, Button, Field, FormMessage, Input, Panel, Select } from "@/components/ui";
import { deleteCategory, renameCategory, saveCategoryAttributes, type CategoryActionState, type CategoryMutationState } from "@/app/categories/actions";
import type { AdminCategory, AttributeDefinition } from "@/lib/category-attributes";

type Draft = Omit<AttributeDefinition, "id" | "category_slug">;
type UiDraft = Draft & { uiId: string };

const typeLabels: Record<Draft["data_type"], string> = { text: "Text", number: "Number", select: "Dropdown" };

function toDraft(row: AttributeDefinition): UiDraft {
  return { uiId: row.id, attribute_key: row.attribute_key, label: row.label, data_type: row.data_type, is_required: row.is_required, options: row.options, min_val: row.min_val, max_val: row.max_val, display_order: row.display_order };
}

export function CategoryManagement({ definitions, categories }: { definitions: AttributeDefinition[]; categories: AdminCategory[] }) {
  const [slug, setSlug] = useState(categories[0]?.slug ?? "");
  const nextId = useRef(0);
  const [rowsByCategory, setRowsByCategory] = useState<Record<string, UiDraft[]>>(() => Object.fromEntries(categories.map((category) => [category.slug, definitions.filter((row) => row.category_slug === category.slug).map(toDraft)])));
  const [optionDrafts, setOptionDrafts] = useState<Record<string, string>>({});
  const [attributeState, attributeAction, savingAttributes] = useActionState<CategoryActionState, FormData>(saveCategoryAttributes, undefined);
  const [categoryState, renameAction, renaming] = useActionState<CategoryMutationState, FormData>(renameCategory.bind(null, slug), undefined);
  const [deleteState, deleteAction, deleting] = useActionState<CategoryMutationState, FormData>(deleteCategory.bind(null, slug), undefined);
  const rows = rowsByCategory[slug] ?? [];
  const selectedCategory = categories.find((category) => category.slug === slug);
  const definitionsForSubmit = rows.map((row, index) => {
    const { uiId, ...definition } = row;
    void uiId;
    return { ...definition, display_order: (index + 1) * 10 };
  });
  const count = useMemo(() => Object.fromEntries(categories.map((category) => [category.slug, (rowsByCategory[category.slug] ?? []).length])), [rowsByCategory, categories]);
  const update = (uiId: string, change: Partial<Draft>) => setRowsByCategory((current) => ({ ...current, [slug]: current[slug].map((row) => row.uiId === uiId ? { ...row, ...change } : row) }));
  const remove = (uiId: string) => setRowsByCategory((current) => ({ ...current, [slug]: current[slug].filter((row) => row.uiId !== uiId) }));
  const move = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= rows.length) return;
    setRowsByCategory((current) => {
      const next = [...current[slug]];
      [next[index], next[destination]] = [next[destination], next[index]];
      return { ...current, [slug]: next };
    });
  };
  const addOption = (row: UiDraft) => {
    const option = (optionDrafts[row.uiId] ?? "").trim();
    if (!option || row.options.includes(option)) return;
    update(row.uiId, { options: [...row.options, option] });
    setOptionDrafts((current) => ({ ...current, [row.uiId]: "" }));
  };
  const addSpecification = () => setRowsByCategory((current) => ({
    ...current,
    [slug]: [...(current[slug] ?? []), { uiId: "new-" + nextId.current++, attribute_key: "", label: "", data_type: "text", is_required: false, options: [], min_val: null, max_val: null, display_order: 0 }],
  }));

  return <div className="space-y-8">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => <button type="button" key={category.slug} onClick={() => setSlug(category.slug)} className={slug === category.slug ? "border border-ink bg-sand p-4 text-left" : "border border-line bg-white p-4 text-left"}><p className="font-medium">{category.label}</p><p className="mt-1 text-sm text-ink-soft">{count[category.slug]} attribute{count[category.slug] === 1 ? "" : "s"}</p></button>)}
    </div>
    {selectedCategory && <>
      <Panel title="Category" description="Rename or remove this listing category.">
        <form key={slug} action={renameAction} className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1"><Field label="Category name" id="category-name" name="label" defaultValue={selectedCategory.label} required /></div>
          <Button type="submit" variant="outline" disabled={renaming}>{renaming ? "Saving…" : "Rename category"}</Button>
        </form>
        <form action={deleteAction} className="mt-3"><Button type="submit" variant="outline" disabled={deleting} className="border-bad text-bad hover:bg-sand">{deleting ? "Deleting…" : "Delete category"}</Button></form>
        <div className="mt-3"><FormMessage state={categoryState} /><FormMessage state={deleteState} /></div>
      </Panel>
      <Panel title={selectedCategory.label + " specifications"} description="Changes affect future listings only; saved listing values are never modified.">
      <form action={attributeAction} className="space-y-4">
        <input type="hidden" name="category_slug" value={slug} />
        <input type="hidden" name="definitions" value={JSON.stringify(definitionsForSubmit)} />
        {rows.map((row, index) => <section key={row.uiId} className="mb-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex min-w-0 items-center gap-2"><h3 className="truncate font-medium">{row.label || "New attribute"}</h3><Badge tone="neutral">{typeLabels[row.data_type]}</Badge></div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={row.is_required} onChange={(event) => update(row.uiId, { is_required: event.target.checked })} /> Required on listing creation</label>
              <button type="button" aria-label={"Move " + (row.label || "attribute") + " up"} disabled={index === 0} onClick={() => move(index, -1)} className="rounded-sm border border-line px-2 py-1 text-sm disabled:opacity-40">↑</button>
              <button type="button" aria-label={"Move " + (row.label || "attribute") + " down"} disabled={index === rows.length - 1} onClick={() => move(index, 1)} className="rounded-sm border border-line px-2 py-1 text-sm disabled:opacity-40">↓</button>
              <button type="button" aria-label={"Remove " + (row.label || "attribute")} onClick={() => remove(row.uiId)} className="rounded-sm px-2 py-1 text-sm text-bad hover:bg-sand">🗑</button>
            </div>
          </header>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Label" id={"label-" + row.uiId} value={row.label} onChange={(event) => update(row.uiId, { label: event.target.value, attribute_key: slugify(event.target.value) })} required />
            <label className="text-sm font-medium">Data type<Select className="mt-2" value={row.data_type} onChange={(event) => update(row.uiId, { data_type: event.target.value as Draft["data_type"], options: event.target.value === "select" ? row.options : [] })}><option value="text">Text</option><option value="number">Number</option><option value="select">Dropdown</option></Select></label>
            {row.data_type === "number" && <div className="grid grid-cols-2 gap-3 md:col-span-2"><Field label="Minimum Value" id={"min-" + row.uiId} type="number" value={row.min_val ?? ""} onChange={(event) => update(row.uiId, { min_val: event.target.value === "" ? null : Number(event.target.value) })} /><Field label="Maximum Value" id={"max-" + row.uiId} type="number" value={row.max_val ?? ""} onChange={(event) => update(row.uiId, { max_val: event.target.value === "" ? null : Number(event.target.value) })} /></div>}
            {row.data_type === "select" && <div className="md:col-span-2"><p className="text-sm font-medium">Dropdown options</p><div className="mt-2 flex flex-wrap gap-2">{row.options.map((option) => <span key={option} className="inline-flex items-center gap-1 rounded-full border border-line bg-sand px-3 py-1 text-sm">{option}<button type="button" aria-label={"Remove " + option} onClick={() => update(row.uiId, { options: row.options.filter((value) => value !== option) })} className="text-ink-soft hover:text-bad">×</button></span>)}{!row.options.length && <span className="text-sm text-ink-soft">No options yet.</span>}</div><div className="mt-3 flex gap-2"><Input aria-label="Add dropdown option" placeholder="Add option…" value={optionDrafts[row.uiId] ?? ""} onChange={(event) => setOptionDrafts((current) => ({ ...current, [row.uiId]: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addOption(row); } }} /><Button type="button" variant="outline" onClick={() => addOption(row)}>Add</Button></div></div>}
          </div>
        </section>)}
        <div className="sticky bottom-0 -mx-6 border-t border-line bg-cream px-6 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]"><div className="flex flex-wrap items-center justify-between gap-3"><Button type="button" variant="outline" onClick={addSpecification}>+ Add specification</Button><div className="flex items-center gap-3"><FormMessage state={attributeState} /><Button type="submit" disabled={savingAttributes}>{savingAttributes ? "Saving…" : "Save specifications"}</Button></div></div></div>
      </form>
      </Panel>
    </>}
  </div>;
}

function slugify(value: string) { return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""); }
