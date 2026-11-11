import { createAdminClient } from "@/lib/supabase/admin";

/**
 * S6-13: how often owners use the AI-suggested replies, by kind of reply.
 * Every suggestion stored was shown to an owner; "used" means they tapped it
 * and sent the message, either as it was or after editing it. Counted in the
 * database (public.reply_suggestion_usage), not here.
 */

export type ReplySuggestionUsage = {
  suggestion_type: string;
  shown: number;
  sent_as_is: number;
  edited: number;
  used_percent: number | null;
};

export const SUGGESTION_TYPE_LABELS: Record<string, string> = {
  AVAILABILITY: "Availability",
  PRICE: "Price",
  MEETUP: "Meetup",
  ITEM_DETAILS: "Item details",
  BOOKING: "Booking",
  THANKS: "Thanks / pleasantries",
  OTHER: "Other",
};

export async function getReplySuggestionUsage(): Promise<ReplySuggestionUsage[]> {
  const { data, error } = await createAdminClient()
    .from("reply_suggestion_usage")
    .select("suggestion_type,shown,sent_as_is,edited,used_percent")
    .order("shown", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({ ...row, used_percent: row.used_percent === null ? null : Number(row.used_percent) }));
}

/** All types together, for the table's total row. */
export function totalUsage(rows: ReplySuggestionUsage[]): ReplySuggestionUsage {
  const shown = rows.reduce((sum, row) => sum + row.shown, 0);
  const asIs = rows.reduce((sum, row) => sum + row.sent_as_is, 0);
  const edited = rows.reduce((sum, row) => sum + row.edited, 0);
  return {
    suggestion_type: "ALL",
    shown,
    sent_as_is: asIs,
    edited,
    used_percent: shown ? Math.round((1000 * (asIs + edited)) / shown) / 10 : null,
  };
}
