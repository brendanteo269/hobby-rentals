import type { MessageWarning } from "@/lib/conversations";

/**
 * S4-15: the concerns about one message as one heading, one paragraph and, for
 * the automated check, one small line. The automated check is advisory and
 * can be wrong, so it never takes the main text: it sits under whatever else
 * was found. If it is the only concern, its sentence is the paragraph.
 */
export function combineWarnings(warnings: MessageWarning[]): { title: string; body: string; note: string } {
  const automated = warnings.filter((warning) => warning.kind === "AI_CONCERN");
  const others = warnings.filter((warning) => warning.kind === "CONTACT_DETAILS");
  const join = (items: MessageWarning[]) => items.map((warning) => warning.detail).join(" ");
  return {
    title: warnings.length === 1 ? warnings[0].title : "Please review before sending",
    body: others.length > 0 ? join(others) : join(automated),
    note: others.length > 0 ? join(automated) : "",
  };
}
