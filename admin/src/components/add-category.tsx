"use client";

import { useActionState, useEffect, useState } from "react";
import { addCategory, type AddCategoryState } from "@/app/categories/actions";
import { Button, Field } from "@/components/ui";
import { useToast } from "@/components/toast";

export function AddCategory() {
  const [label, setLabel] = useState("");
  const [state, action, pending] = useActionState<AddCategoryState, FormData>(addCategory, undefined);
  const { show } = useToast();
  useEffect(() => {
    const message = state?.success ?? state?.error;
    if (message) {
      show(message, state?.error ? "error" : "success");
    }
  }, [show, state]);
  return <form action={action} className="mt-6 grid gap-4 border border-line bg-sand p-5 md:grid-cols-[1fr_auto]">
    <Field label="New category name" id="new-category-label" name="label" value={label} onChange={(event) => setLabel(event.target.value)} required />
    <div className="flex items-end"><Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add category"}</Button></div>
  </form>;
}
