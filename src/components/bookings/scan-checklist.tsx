import {
  checklistRows,
  type CheckCell,
  type ConditionScan,
} from "@/lib/condition-scans";

const TONE: Record<CheckCell["tone"], { mark: string; className: string }> = {
  ok: { mark: "✓", className: "text-success" },
  found: { mark: "!", className: "font-semibold text-accent-dark" },
  none: { mark: "", className: "text-ink-soft" },
};

/** S3-05: every step the scan took, per side of the item, so the owner can see how the verdict was reached. */
export function ScanChecklist({ scan }: { scan: ConditionScan }) {
  const rows = checklistRows(scan);
  return (
    <section aria-labelledby="checklist-heading" className="space-y-3">
      <div>
        <h2 id="checklist-heading" className="heading text-xl">
          What the AI checked
        </h2>
        <p className="text-sm text-ink-soft">
          Each side of the item, step by step. ✓ checked and fine · ! needs your
          attention.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">
                Check
              </th>
              {scan.angles.map((angle) => (
                <th
                  key={angle.angle}
                  scope="col"
                  className="px-3 py-2 font-medium"
                >
                  {angle.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.label}>
                <th
                  scope="row"
                  className="px-3 py-2 align-top font-medium text-ink"
                >
                  {row.label}
                  <span className="block text-xs font-normal text-ink-soft">
                    {row.hint}
                  </span>
                </th>
                {row.cells.map((cell, index) => (
                  <td
                    key={scan.angles[index].angle}
                    className={`px-3 py-2 align-top ${TONE[cell.tone].className}`}
                  >
                    {TONE[cell.tone].mark && (
                      <span aria-hidden>{TONE[cell.tone].mark} </span>
                    )}
                    {cell.text}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
