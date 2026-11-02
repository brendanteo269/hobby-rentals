/** S5-03 AI Search-Gap Check: what the API returns. Safe for client components. */

export type SearchGapTopic = {
  label: string;
  examples: string[];
  search_count: number;
  covered: boolean;
  /** A category attribute key, or "description". */
  fix: string;
  fix_label: string;
  /** What to state if it is true, with an example. Advice to the owner, never listing text. */
  hint: string;
};

export type SearchGapResult = {
  listing_id: string;
  /** Null when there was too little search data and the category has no specifications. */
  score: number | null;
  enough_search_data: boolean;
  relevant_searches: number;
  missing: SearchGapTopic[];
  covered: SearchGapTopic[];
  checked_at: string;
  /** Searches the listing's name already answers ("4 person tent"). */
  answered_by_name: number;
};

export type SearchVisibilityRow = {
  listing_id: string;
  listing_name: string;
  listing_status: string;
  score: number | null;
  top_missing_topic: string | null;
  enough_search_data: boolean | null;
  checked_at: string | null;
};

/** The listing form's id for the field a topic points at. */
export function fixFieldId(fix: string): string {
  return fix === "description" ? "description" : `attributes.${fix}`;
}
