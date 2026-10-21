import { Panel } from "./ui";
import { AI_SUGGESTION_LABELS, DECISION_LABELS, type AiAgreementRow } from "@/lib/moderation";

/**
 * How often the AI triage and the administrators agree, over decided reports
 * the AI assessed (listing and user reports together): what it suggested
 * against what was decided. Read this before turning automatic dismissal on.
 */
export function AiAgreementPanel({ rows }: { rows: AiAgreementRow[] }) {
  if (rows.length === 0) return null;
  return (
    <Panel
      title="AI triage and the administrators"
      description="On decided reports the AI assessed, listings and users together: what it suggested against what was decided."
    >
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            {["AI suggested", "Decided", "By", "Reports", "Of those, confident"].map((heading) => (
              <th key={heading} scope="col" className="eyebrow py-2 pr-6 font-normal">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.suggestion}-${row.decision}-${row.decided_by}`} className="border-b border-line last:border-0">
              <td className="py-2 pr-6">{AI_SUGGESTION_LABELS[row.suggestion]}</td>
              <td className="py-2 pr-6">{DECISION_LABELS[row.decision]}</td>
              <td className="py-2 pr-6 text-ink-soft">{row.decided_by === "AI" ? "AI" : "Administrator"}</td>
              <td className="py-2 pr-6">{row.reports}</td>
              <td className="py-2 pr-6">{row.confident_reports}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
