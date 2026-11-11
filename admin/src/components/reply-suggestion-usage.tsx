import { SUGGESTION_TYPE_LABELS, totalUsage, type ReplySuggestionUsage } from "@/lib/reply-suggestions";

/** S6-13 Scenario 5: the share of suggested replies owners used, per kind. */
export function ReplySuggestionUsageTable({ rows }: { rows: ReplySuggestionUsage[] | null }) {
  if (rows === null) return <p role="alert" className="mt-8 text-sm text-bad">Could not load suggested-reply usage.</p>;
  if (rows.length === 0) return <p className="body-copy mt-8">No suggested replies have been shown yet.</p>;
  const total = totalUsage(rows);
  const percent = (value: number | null) => (value === null ? "—" : `${value.toFixed(1)}%`);
  return (
    <div className="mt-8 overflow-x-auto border border-line bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-line bg-sand text-ink-soft">
          <tr>
            <th className="p-3">Kind of reply</th>
            <th className="p-3">Shown</th>
            <th className="p-3">Sent as is</th>
            <th className="p-3">Edited, then sent</th>
            <th className="p-3">Used</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.suggestion_type} className="border-b border-line">
              <td className="p-3 font-medium">{SUGGESTION_TYPE_LABELS[row.suggestion_type] ?? row.suggestion_type}</td>
              <td className="p-3">{row.shown}</td>
              <td className="p-3">{row.sent_as_is}</td>
              <td className="p-3">{row.edited}</td>
              <td className="p-3">{percent(row.used_percent)}</td>
            </tr>
          ))}
          <tr className="bg-sand font-medium">
            <td className="p-3">All</td>
            <td className="p-3">{total.shown}</td>
            <td className="p-3">{total.sent_as_is}</td>
            <td className="p-3">{total.edited}</td>
            <td className="p-3">{percent(total.used_percent)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
