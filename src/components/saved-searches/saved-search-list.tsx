"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { removeSavedSearch } from "@/app/saved-searches/actions";
import { useToast } from "@/components/toast";
import { formatDate } from "@/lib/format";
import { savedSearchCriteriaLabel, savedSearchLabel, type SavedSearch } from "@/lib/saved-searches";

export function SavedSearchList({ searches }: { searches: SavedSearch[] }) {
  const [pending, startTransition] = useTransition(); const { show } = useToast();
  function remove(id: string) { if (!window.confirm("Delete this saved search? It will no longer send alerts.")) return; startTransition(async () => { const result = await removeSavedSearch(id); if ("error" in result && result.error) show(result.error, "error"); else show("Saved search deleted."); }); }
  return <ul className="divide-y divide-line card overflow-hidden">{searches.map((search) => <li key={search.id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div><h2 className="font-medium text-ink">{savedSearchLabel(search.criteria)}</h2><p className="mt-1 text-sm text-ink-soft">{savedSearchCriteriaLabel(search.criteria) || "All listings"}</p><p className="mt-2 text-xs text-ink-soft">Saved {formatDate(search.created_at)}</p></div><button type="button" disabled={pending} onClick={() => remove(search.id)} className="inline-flex items-center gap-1.5 text-sm text-accent-dark underline underline-offset-4 disabled:opacity-60"><Trash2 className="size-4" aria-hidden="true" />Delete</button></li>)}</ul>;
}
