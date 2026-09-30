"use client";

import { useActionState, useState } from "react";
import { addCategory, type AddCategoryState } from "@/app/categories/actions";
import { Button, Field, FormMessage } from "@/components/ui";

export function AddCategory() {
  const [label, setLabel] = useState("");
  const [state, action, pending] = useActionState<AddCategoryState, FormData>(addCategory, undefined);
  return <form action={action} className="mt-6 grid gap-4 border border-line bg-sand p-5 md:grid-cols-[1fr_1fr_auto]">
    <Field label="New category name" id="new-category-label" name="label" value={label} onChange={(event) => setLabel(event.target.value)} required />
    <Field label="Category key" id="new-category-slug" name="slug" value={slugify(label)} readOnly hint="Generated from the name; stored on listings." required />
    <div className="flex items-end"><Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add category"}</Button></div>
    <div className="md:col-span-3"><FormMessage state={state} /></div>
  </form>;
}

function slugify(value: string) { return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, ""); }
