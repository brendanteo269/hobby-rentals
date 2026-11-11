import Link from "next/link";
import type { Route } from "next";
import { ChevronDown, TrendingUp } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { DemandForecastQuietRows } from "@/components/demand-forecast-quiet-rows";
import { CATEGORY_LABELS } from "@/lib/listings";
import { formatDate } from "@/lib/format";
import {
  FORECAST_LEVEL_LABELS,
  forecastSpanLabel,
  forecastWeekSpanLabel,
  forecastWeeksEnd,
  forecastWeeksSpan,
  holidayBands,
  type DemandForecast,
  type ForecastAttention,
  type ForecastLevel,
} from "@/lib/demand-forecast";

type Listing = DemandForecast["listings"][number];

/**
 * High demand is an opportunity, so it gets the warm sand tint and an upward
 * mark rather than red. Red is kept for the actual warning: being
 * unavailable in a High week. Normal and Low stay neutral.
 */
const LEVEL_CELL: Record<ForecastLevel, string> = {
  HIGH: "bg-sand text-ink font-semibold",
  NORMAL: "text-ink-soft",
  LOW: "bg-surface-muted text-ink-soft",
  NOT_ENOUGH_DATA: "text-ink-soft",
};

function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

function availabilityHref(listingId: string): Route {
  return `/listings/${listingId}/edit#availability` as Route;
}

/** Layer 1: the one decision to make. Only rendered when there is something to act on. */
function AttentionCard({ items }: { items: ForecastAttention[] }) {
  const [first, ...rest] = items;
  return (
    <section aria-labelledby="forecast-attention" className="card border-accent/30 bg-accent-soft/40 p-5">
      <p className="eyebrow text-accent-dark">High-demand week</p>
      <h2 id="forecast-attention" className="heading mt-1 text-lg">
        Your {first.listing_name} is unavailable {forecastSpanLabel(first.first_day, first.last_day)}
      </h2>
      <p className="mt-1 text-sm text-ink-soft">Renter interest is expected to be higher from {forecastWeekSpanLabel(first.week_start)}.</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        <ButtonLink href={availabilityHref(first.listing_id)}>Manage availability</ButtonLink>
        <Link href={`/listings/${first.listing_id}/edit#price` as Route} className="text-sm font-medium underline underline-offset-4">
          View pricing guidance
        </Link>
      </div>
      {rest.length > 0 && (
        <ul className="mt-5 space-y-1.5 border-t border-accent/20 pt-3 text-sm">
          {rest.map((item) => (
            <li key={`${item.listing_id}-${item.week_start}`} className="flex flex-wrap items-baseline justify-between gap-x-4">
              <span>
                <span className="font-medium">{item.listing_name}</span>
                <span className="text-ink-soft"> is unavailable {forecastSpanLabel(item.first_day, item.last_day)}</span>
              </span>
              <Link href={availabilityHref(item.listing_id)} className="text-xs underline underline-offset-2">Manage availability</Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type Levels = Map<string, Map<string, ForecastLevel>>;

function ListingRow({ listing, levels, weeks }: { listing: Listing; levels: Map<string, ForecastLevel> | undefined; weeks: DemandForecast["weeks"] }) {
  const unavailable = new Map(listing.unavailable.map((span) => [span.week_start, span]));
  return (
    <tr>
      {/* Sticky so the item stays in view while the weeks scroll on a phone. */}
      <th scope="row" className="sticky left-0 z-10 max-w-52 bg-white py-1 pr-3 text-left align-middle font-normal">
        <p className="truncate font-medium">{listing.listing_name}</p>
        <p className="truncate text-xs text-ink-soft">{categoryLabel(listing.category)}</p>
      </th>
      {weeks.map((week) => {
        const level = levels?.get(week.week_start) ?? "NOT_ENOUGH_DATA";
        const span = unavailable.get(week.week_start);
        const conflict = level === "HIGH" && span !== undefined;
        return (
          <td key={week.week_start} className={`rounded-lg px-2 py-2 text-center align-middle text-xs ${LEVEL_CELL[level]} ${conflict ? "ring-1 ring-inset ring-accent" : ""}`}>
            <span className="inline-flex items-center gap-1">
              {level === "HIGH" && <TrendingUp className="size-3" aria-hidden />}
              {level === "NOT_ENOUGH_DATA" ? "—" : FORECAST_LEVEL_LABELS[level]}
            </span>
            {span && (
              <span className={`mt-1 block whitespace-nowrap text-[10px] ${conflict ? "font-semibold text-accent-dark" : "font-normal text-ink-soft"}`}>
                Unavailable {forecastSpanLabel(span.first_day, span.last_day)}
              </span>
            )}
          </td>
        );
      })}
    </tr>
  );
}

function levelsOf(forecast: DemandForecast): Levels {
  return new Map(forecast.categories.map((row) => [row.category, new Map(row.levels.map((cell) => [cell.week_start, cell.level]))]));
}

/** A listing has a forecast once its category has history for at least one upcoming week. */
function hasForecast(levels: Map<string, ForecastLevel> | undefined): boolean {
  return [...(levels?.values() ?? [])].some((level) => level !== "NOT_ENOUGH_DATA");
}

/** A listing worth looking at: any week that is not typical. Blocked days in a High week fall under that too. */
function standsOut(levels: Map<string, ForecastLevel> | undefined): boolean {
  return [...(levels?.values() ?? [])].some((level) => level === "LOW" || level === "HIGH");
}

function listingCount(count: number): string {
  return count === 1 ? "1 listing" : `${count} listings`;
}

function quietSummary(count: number): string {
  return `${listingCount(count)} ${count === 1 ? "has" : "have"} typical demand across all upcoming weeks`;
}

/** "A, B and C". */
function joinWithAnd(items: string[]): string {
  return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** The week-by-week grid. `folded` listings sit behind one summary line under `rows`. */
function OutlookTable({ forecast, levels, rows, folded }: { forecast: DemandForecast; levels: Levels; rows: Listing[]; folded: Listing[] }) {
  const bands = holidayBands(forecast.weeks);
  const row = (listing: Listing) => <ListingRow key={listing.listing_id} listing={listing} levels={levels.get(listing.category)} weeks={forecast.weeks} />;
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[48rem] border-separate border-spacing-x-1 border-spacing-y-1.5 text-sm">
        <caption className="sr-only">Expected renter interest for each of your active listings, week by week</caption>
        <thead>
          {bands.length > 0 && (
            <tr aria-hidden>
              <td className="sticky left-0 z-10 bg-white" />
              {forecast.weeks.map((week, index) => {
                const band = bands.find((b) => b.startIndex === index);
                if (band) {
                  return (
                    <td key={week.week_start} colSpan={band.length} className="rounded-md bg-surface-muted px-2 py-1 text-center text-[11px] text-ink-soft">
                      {band.label} · {band.span}
                    </td>
                  );
                }
                return bands.some((b) => index > b.startIndex && index < b.startIndex + b.length) ? null : <td key={week.week_start} />;
              })}
            </tr>
          )}
          <tr>
            <th scope="col" className="sticky left-0 z-10 bg-white pr-3 text-left text-xs font-medium text-ink-soft">Listing</th>
            {forecast.weeks.map((week) => (
              <th key={week.week_start} scope="col" className="whitespace-nowrap px-1 text-center text-xs font-medium" title={week.holiday ?? undefined}>
                {forecastWeekSpanLabel(week.week_start)}
                {week.holiday && <span className="sr-only">, {week.holiday}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row)}
          {folded.length > 0 && (
            <DemandForecastQuietRows summary={quietSummary(folded.length)} columns={forecast.weeks.length + 1}>
              {folded.map(row)}
            </DemandForecastQuietRows>
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Layer 2, only as detailed as it is useful: the grid when some week stands
 * out, one sentence when none does, and a closing note on the listings whose
 * categories are still building history.
 */
function Outlook({ forecast, levels }: { forecast: DemandForecast; levels: Levels }) {
  const forecastable = forecast.listings.filter((listing) => hasForecast(levels.get(listing.category)));
  const pending = forecast.listings.filter((listing) => !hasForecast(levels.get(listing.category)));
  const prominent = forecastable.filter((listing) => standsOut(levels.get(listing.category)));
  const quiet = forecastable.filter((listing) => !standsOut(levels.get(listing.category)));
  const pendingCategories = [...new Set(pending.map((listing) => categoryLabel(listing.category)))];
  const lastWeek = forecast.weeks[forecast.weeks.length - 1]?.week_start;

  return (
    <section aria-labelledby="forecast-outlook" className="card p-5">
      {forecastable.length > 0 && <p className="eyebrow">{forecastWeeksSpan(forecast.weeks[0].week_start, lastWeek)}</p>}
      <h2 id="forecast-outlook" className="heading mt-1 text-xl">Availability outlook</h2>
      {forecast.run_week === null ? (
        <p className="body-copy mt-1">Forecasts will appear here after the first weekly forecast on Monday.</p>
      ) : forecastable.length === 0 ? (
        <p className="body-copy mt-1">Forecasts will appear here once there is enough rental history in your listings&apos; categories.</p>
      ) : prominent.length > 0 ? (
        <>
          <p className="body-copy mt-1">Expected renter interest for your active listings.</p>
          <OutlookTable forecast={forecast} levels={levels} rows={prominent} folded={quiet} />
        </>
      ) : (
        <>
          <p className="body-copy mt-1">
            No unusual weeks expected for your {listingCount(quiet.length)} with a forecast through {forecastWeeksEnd(lastWeek)}.
          </p>
          <details className="group mt-3">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs text-ink-soft hover:text-ink">
              Show weekly view
              <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <OutlookTable forecast={forecast} levels={levels} rows={quiet} folded={[]} />
          </details>
        </>
      )}
      {forecastable.length > 0 && pending.length > 0 && (
        <p className="mt-5 border-t border-line pt-3 text-xs text-ink-soft">
          {listingCount(pending.length)} {pending.length === 1 ? "does" : "do"} not have a forecast yet. We&apos;re building rental history
          for {joinWithAnd(pendingCategories)}.
        </p>
      )}
    </section>
  );
}

/** Layer 3: whether past forecasts were right, then - only if asked - how they are made. */
function Accuracy({ forecast }: { forecast: DemandForecast }) {
  const scored = forecast.categories.filter((row) => row.accuracy.shown);
  return (
    <section aria-labelledby="forecast-accuracy" className="card p-5 text-sm">
      <h2 id="forecast-accuracy" className="font-medium">Forecast accuracy</h2>
      <ul className="mt-2 space-y-1 text-ink-soft">
        {scored.length === 0 && <li>Accuracy will appear after forecasts have been compared with completed rental weeks.</li>}
        {scored.map(({ category, accuracy }) => (
          <li key={category}>
            {categoryLabel(category)} matched {accuracy.matched_weeks} of the last {accuracy.scored_weeks} weeks.
          </li>
        ))}
      </ul>
      <details className="group mt-4 text-ink-soft">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs hover:text-ink">
          How demand is estimated
          <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="mt-2 max-w-2xl space-y-2 text-xs leading-relaxed">
          <p>
            Each category is forecast from its past bookings, renter searches, listing views, saved searches, gear requests for specific dates,
            and Singapore school and public holidays.
          </p>
          <p>
            Accuracy compares each week&apos;s forecast, made a week ahead, with the bookings that followed
            {forecast.measured_since ? `, from ${formatDate(forecast.measured_since)}` : ""}. Updated every Monday
            {forecast.made_at ? `, most recently ${formatDate(forecast.made_at)}` : ""}.
          </p>
        </div>
      </details>
    </section>
  );
}

/**
 * S6-06 on the owner's Insights page, in the order an owner needs it: what
 * to act on, the outlook, then whether to trust it. The notification links
 * to #demand-forecast.
 */
export function DemandForecastSection({ forecast }: { forecast: DemandForecast }) {
  if (forecast.listings.length === 0) return null;
  const levels = levelsOf(forecast);
  // Nothing to measure until some listing has a forecast.
  const measurable = forecast.listings.some((listing) => hasForecast(levels.get(listing.category)));
  return (
    <div id="demand-forecast" className="scroll-mt-24 space-y-4">
      {forecast.needs_attention.length > 0 && <AttentionCard items={forecast.needs_attention} />}
      <Outlook forecast={forecast} levels={levels} />
      {measurable && <Accuracy forecast={forecast} />}
    </div>
  );
}
