import { Container } from "@/components/ui";
import { requirePortalSession } from "@/lib/admin";
import { getAdminCategoryDemand } from "@/lib/analytics";

export const metadata = { title: "Category demand — HobbyRentals Admin" };

export default async function AnalyticsPage() {
  await requirePortalSession();
  let rows = null;
  try { rows = await getAdminCategoryDemand(); } catch { /* render an operational error without losing portal chrome */ }
  return <Container className="py-12"><p className="eyebrow">Admin</p><h1 className="display-caps mt-3 text-3xl">Category activity & demand</h1><p className="body-copy mt-3">Current seven-day activity against the prior 28-day baseline.</p>{rows ? <div className="mt-8 overflow-x-auto border border-line bg-white"><table className="min-w-full text-left text-sm"><thead className="border-b border-line bg-sand text-ink-soft"><tr><th className="p-3">Category</th><th className="p-3">7-day views</th><th className="p-3">7-day searches</th><th className="p-3">Baseline</th><th className="p-3">Surge</th><th className="p-3">Status</th></tr></thead><tbody>{rows.map((row) => <tr key={row.category} className="border-b border-line last:border-0"><td className="p-3 font-medium">{row.label}</td><td className="p-3">{row.views_7d}</td><td className="p-3">{row.searches_7d}</td><td className="p-3">{row.baseline_score.toFixed(1)}</td><td className="p-3">{row.surge_percentage > 0 ? "+" : ""}{row.surge_percentage.toFixed(1)}%</td><td className="p-3">{row.is_high_demand ? "High demand" : "Normal"}</td></tr>)}</tbody></table></div> : <p role="alert" className="mt-8 text-sm text-bad">Could not load category activity.</p>}</Container>;
}
