"use client";

import { BookmarkPlus } from "lucide-react";
import { useTransition } from "react";
import { saveSearch } from "@/app/saved-searches/actions";
import { useToast } from "@/components/toast";
import { hasSavedCriteria, savedCriteriaFromBrowse } from "@/lib/saved-searches";
import type { BrowseFilters } from "@/lib/browse-params";

export function SaveSearchButton({ filters, prominent = false }: { filters: BrowseFilters; prominent?: boolean }) {
  const [pending, startTransition] = useTransition();
  const { show } = useToast();
  const enabled = hasSavedCriteria(filters);
  function save() {
    startTransition(async () => {
      const result = await saveSearch(savedCriteriaFromBrowse(filters));
      if ("error" in result) show(result.error, "error");
      else show(result.created ? "Search saved. We’ll alert you when a listing matches." : "This search is already saved.");
    });
  }
  return <button type="button" disabled={!enabled || pending} onClick={save} title={enabled ? undefined : "Add a keyword or supported filter to save this search."} className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed ${prominent ? "bg-accent text-white hover:bg-accent-dark disabled:bg-surface-muted disabled:text-ink-soft" : "border border-line bg-white text-ink hover:border-ink disabled:text-ink-soft"}`}>
    <BookmarkPlus className="size-4" aria-hidden="true" />{pending ? "Saving…" : "Save search"}
  </button>;
}
