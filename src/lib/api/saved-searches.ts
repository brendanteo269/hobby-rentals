import "server-only";
import { backendRequest } from "@/lib/api/client";
import type { SavedSearch } from "@/lib/saved-searches";

export { BackendApiError as SavedSearchApiError } from "@/lib/api/client";
export function getSavedSearches() { return backendRequest<SavedSearch[]>("/saved-searches"); }
export function createSavedSearch(criteria: unknown) { return backendRequest<{ search: SavedSearch; created: boolean }>("/saved-searches", { method: "POST", body: JSON.stringify(criteria) }); }
export function deleteSavedSearch(id: string) { return backendRequest(`/saved-searches/${encodeURIComponent(id)}`, { method: "DELETE" }); }
