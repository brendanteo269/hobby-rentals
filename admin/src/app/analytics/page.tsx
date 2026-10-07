import { MetricHelp } from "@/components/metric-help";
import { Container } from "@/components/ui";
import { requirePortalSession } from "@/lib/admin";
import { getAdminCategoryDemand } from "@/lib/analytics";

export const metadata = { title: "Category demand — HobbyRentals Admin" };

export default async function AnalyticsPage() {
  await requirePortalSession();
  let rows = null;
  try {
    rows = await getAdminCategoryDemand();
  } catch {
    // Keep the portal usable when the analytics API is unavailable.
  }

  return <Container className="py-12">
    <p className="eyebrow">Admin</p>
    <h1 className="display-caps mt-3 text-3xl">Category activity & demand</h1>
    {rows ? <div className="mt-8 overflow-x-auto border border-line bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-line bg-sand text-ink-soft">
          <tr>
            <th className="p-3">Category<MetricHelp label="category"><p><span className="font-semibold">Backend calculation:</span> Groups listings by their marketplace category enum.</p><p className="mt-2"><span className="font-semibold">Direct impact:</span> Isolates pricing pools and demand metrics so one category&apos;s activity never affects another&apos;s suggestions or badges.</p></MetricHelp></th>
            <th className="p-3">7-day views<MetricHelp label="7-day views"><p><span className="font-semibold">Backend calculation:</span> Unique active-listing detail views in the last seven days. Only signed-in non-owners count, limited to one view per user per listing every 24 hours.</p><p className="mt-2"><span className="font-semibold">Direct impact:</span> Represents passive customer interest and contributes <span className="font-semibold">1.0 point per view</span> to 7-day velocity.</p></MetricHelp></th>
            <th className="p-3">7-day searches<MetricHelp label="7-day searches"><p><span className="font-semibold">Backend calculation:</span> Intentional category-filter submissions on the <span className="font-semibold">/browse</span> marketplace page over the last seven days.</p><p className="mt-2"><span className="font-semibold">Direct impact:</span> Represents active customer intent and contributes <span className="font-semibold">1.5 points per search</span> to 7-day velocity.</p></MetricHelp></th>
            <th className="p-3">Baseline<MetricHelp label="baseline"><p><span className="font-semibold">Backend calculation:</span> (Prior 28-day views + 1.5 × prior 28-day searches) ÷ 4.</p><p className="mt-2"><span className="font-semibold">Direct impact:</span> The normal seven-day benchmark. A zero baseline or fewer than five total events activates cold-start protection and fixes the multiplier at <span className="font-semibold">1.0×</span>.</p></MetricHelp></th>
            <th className="p-3">Surge<MetricHelp label="surge"><p><span className="font-semibold">Backend calculation:</span> ((7-day velocity − baseline) ÷ baseline) × 100, where velocity = views + (1.5 × searches).</p><p className="mt-2"><span className="font-semibold">Direct impact:</span> Measures change over normal traffic. At <span className="font-semibold">+25.0%</span>, it triggers the 1.15× pricing adjustment and public demand labels.</p></MetricHelp></th>
            <th className="p-3">Status<MetricHelp label="status"><p><span className="font-semibold">Backend calculation:</span> <span className="font-semibold">Active</span> when surge is at least 25% and cold-start minimums are passed; otherwise <span className="font-semibold">Normal</span>.</p><p className="mt-2"><span className="font-semibold">Direct impact:</span> When Active, it multiplies suggested rates, P25 lower bounds, and P75 upper bounds by <span className="font-semibold">1.15× (+15%)</span> and displays the public High Demand label.</p></MetricHelp></th>
          </tr>
        </thead>
        <tbody>{rows.map((row) => <tr key={row.category} className="border-b border-line last:border-0"><td className="p-3 font-medium">{row.label}</td><td className="p-3">{row.views_7d}</td><td className="p-3">{row.searches_7d}</td><td className="p-3">{row.baseline_score.toFixed(1)}</td><td className="p-3">{row.surge_percentage > 0 ? "+" : ""}{row.surge_percentage.toFixed(1)}%</td><td className="p-3">{row.is_high_demand ? "High demand" : "Normal"}</td></tr>)}</tbody>
      </table>
    </div> : <p role="alert" className="mt-8 text-sm text-bad">Could not load category activity.</p>}

    <section className="mt-8 border border-line bg-sand p-6 text-sm text-ink-soft">
      <h2 className="display-caps text-lg text-ink">Pricing Q&amp;A</h2>
      <p className="mt-3"><span className="font-medium text-ink">Which specifications should be pricing factors?</span> Enable only objective characteristics that materially affect value, such as equipment type, capacity, size, sensor format, or power rating. Leave descriptive or cosmetic fields, such as colour and free-text accessories, disabled unless they genuinely determine rental value.</p>
      <p className="mt-3"><span className="font-medium text-ink">What happens if a listing has no configured specifications?</span> Nothing changes: Tier 0 is skipped and the engine begins with Category + Brand + Condition.</p>
      <p className="mt-3"><span className="font-medium text-ink">What happens when an owner changes a pricing factor?</span> The displayed recommendation is cleared. A new request evaluates the updated specification values; changing a non-pricing specification does not invalidate it.</p>
    </section>

    <section className="mt-8 border border-line bg-sand p-6">
      <h2 className="display-caps text-lg">About dynamic price recommendations &amp; demand analytics</h2>
      <p className="body-copy mt-2 max-w-4xl">This dashboard monitors the market data and demand trends used to generate pricing suggestions for equipment owners.</p>
      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold">How the pricing engine works</h3>
          <p className="mt-2 text-sm text-ink-soft">When an owner clicks “Get Price Suggestion”, the engine considers only active listings from other owners in the same category. It converts every comparable to a daily amount, uses a daily rate when one exists (otherwise weekly ÷ 7), and removes extreme rates with a 1.5× Interquartile Range (IQR) filter.</p>
          <p className="mt-3 text-sm text-ink-soft">It needs at least three post-filter comparables. The recommendation is the median daily rate, with P25 and P75 as the lower and upper bounds. It searches through these tiers in order:</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-soft">
            <li><span className="font-medium text-ink">Tier 0 — Specification match:</span> Category + Brand + Condition + every specification marked <span className="font-medium text-ink">Use in price matching</span> by an admin. Text and dropdown values must match ignoring surrounding whitespace and letter case; numeric values must be within 25% of the owner&apos;s value.</li>
            <li><span className="font-medium text-ink">Tier 1 — Exact match:</span> Category + Brand + Condition, used if Tier 0 has too few reliable matches, or if the category has no enabled pricing factors.</li>
            <li><span className="font-medium text-ink">Tier 2 — Condition match:</span> Category + Condition, used if Tier 1 has fewer than three reliable listings.</li>
            <li><span className="font-medium text-ink">Tier 3 — Broad match:</span> Category only, used if Tier 2 has fewer than three reliable listings.</li>
          </ol>
          <p className="mt-3 text-sm text-ink-soft">If Tier 3 still has fewer than three listings after filtering, the system returns <span className="font-medium text-ink">Insufficient market data</span> and leaves the owner free to set a price manually. The owner panel lists each comparable and the fields it matched on.</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">How demand surges work</h3>
          <p className="mt-2 text-sm text-ink-soft">The engine tracks customer interest over the latest seven days — listing views and category searches — and compares it with the prior 28-day baseline. If activity is at least 25% above normal, the category enters <span className="font-medium text-ink">High Demand</span>.</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-soft">
            <li>The recommended rate, lower bound, and upper bound are all raised by a <span className="font-medium text-ink">1.15× (+15%)</span> multiplier.</li>
            <li>A public <span className="font-medium text-ink">High Demand</span> label appears on the browse page for that category and its listing cards.</li>
            <li>Cold-start protection keeps the multiplier at <span className="font-medium text-ink">1.0×</span> when the baseline is zero or total current-plus-baseline activity is under five events.</li>
          </ul>
        </div>
      </div>
    </section>
  </Container>;
}
