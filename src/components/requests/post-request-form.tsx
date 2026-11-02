"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Field, FormNotice, TextareaField } from "@/components/ui";
import { postRequest } from "@/app/requests/actions";

/**
 * S5-13 Scenario 1: posting a request.
 *
 * Kept to the four things the story names - what, when, and the ceiling -
 * plus free text for anything else. Owners are matched on the name alone, so
 * the hint under it is about naming the thing rather than describing it.
 */
export function PostRequestForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await postRequest(formData);
      if ("error" in result) setError(result.error);
      else router.push(`/requests/${result.request.id}` as Route);
    });
  }

  return (
    <form action={submit} className="space-y-5">
      <Field
        label="What are you looking for?"
        id="title"
        name="title"
        required
        maxLength={120}
        placeholder="Canon R6 camera"
        hint="Name the item as an owner would name their listing — that is what we match on."
      />

      <div className="flex flex-wrap gap-4">
        <Field label="From" id="start_date" name="start_date" type="date" required className="w-auto" />
        <Field label="Until" id="end_date" name="end_date" type="date" required className="w-auto" />
      </div>

      <Field
        label="Most you would pay per day (S$)"
        id="max_daily_price"
        name="max_daily_price"
        type="number"
        min="0"
        step="0.01"
        required
        className="w-auto"
        hint="Owners see this before offering, so nobody offers something you could never take."
      />

      <TextareaField
        label="Anything else? (optional)"
        id="details"
        name="details"
        rows={4}
        maxLength={2000}
        placeholder="A spare battery would help. I can collect from the east."
      />

      <FormNotice message={error ?? undefined} />

      <Button type="submit" disabled={isPending}>
        {isPending ? "Posting…" : "Post request"}
      </Button>
    </form>
  );
}
