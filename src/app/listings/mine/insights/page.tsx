import { OwnerPortal, requireOwner } from "@/components/owner-portal";
import { OwnerInsightsDashboard } from "@/components/owner-insights-dashboard";
import { getMyListings } from "@/lib/api/listings";
import { getOwnerInsights } from "@/lib/api/owner-insights";
import { getDemandForecast } from "@/lib/api/demand-forecast";
import { DemandForecastSection } from "@/components/demand-forecast-section";
import { getSearchVisibility } from "@/lib/api/search-gaps";
import { SearchVisibilityTable } from "@/components/search-visibility-table";
import { isInsightsPeriod, type InsightsPeriod } from "@/lib/owner-insights";

export const metadata = { title: "Insights — HobbyRentals" };

/** How the owner's listings are performing over a chosen period, with next steps for each. */
export default async function OwnerInsightsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  await requireOwner();
  const { period: requested } = await searchParams;
  const period: InsightsPeriod = isInsightsPeriod(requested) ? requested : "30d";
  const [listings, insights, visibility, forecast] = await Promise.all([
    getMyListings(),
    // Swallowed so a hiccup in the analytics service shows a notice in place
    // of the dashboard rather than an error page.
    getOwnerInsights(period).catch(() => null),
    getSearchVisibility().catch(() => []),
    // Swallowed too: the forecast is one section, not the page.
    getDemandForecast().catch(() => null),
  ]);

  return (
    <OwnerPortal active="Insights" title="Insights">
      {insights ? (
        <div className="space-y-10">
          {/* Forward-looking and actionable, so it leads; the history below explains how things went. */}
          {forecast && <DemandForecastSection forecast={forecast} />}
          <OwnerInsightsDashboard insights={insights} listings={listings} />
          <SearchVisibilityTable rows={visibility} />
        </div>
      ) : (
        <p className="rounded-xl border border-line bg-surface-muted p-4 text-sm text-ink-soft">
          Insights are temporarily unavailable. Please try again shortly.
        </p>
      )}
    </OwnerPortal>
  );
}
