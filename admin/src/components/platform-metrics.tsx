import type { ReactNode } from "react";
import type { Route } from "next";
import Link from "next/link";
import { MetricHelp } from "@/components/metric-help";
import { Button, Input, Panel } from "@/components/ui";
import type { LostRequests, PlatformMetrics, PlatformPeriodMetrics, ViewedNotBookedListing } from "@/lib/analytics";
import { formatDate, formatMoney } from "@/lib/format";
import { ROUTES } from "@/lib/routes";

type MetricKey = keyof PlatformPeriodMetrics;
type Range = { from: string; to: string };

/** The bookings list, narrowed to the given statuses and to bookings made in the range. */
function bookingsHref(statuses: string[], { from, to }: Range): Route {
  const params = new URLSearchParams({ from, to });
  statuses.forEach((s) => params.append("status", s));
  return `${ROUTES.bookings}?${params}` as Route;
}

const SALES = ["CONFIRMED", "ACTIVE", "COMPLETED"];
const viewSales = (range: Range) => ({ href: bookingsHref(SALES, range), label: "View bookings" });

const METRICS: { key: MetricKey; label: string; format: (value: number) => string; help: ReactNode; link?: (range: Range) => { href: Route; label: string } }[] = [
  {
    key: "bookings", label: "Bookings", format: (v) => v.toLocaleString("en-SG"), link: viewSales,
    help: <>Rentals made in the range that the owner confirmed and that were not cancelled: confirmed, in progress or completed. A bundle counts once. Pending, declined, expired and cancelled requests are excluded.</>,
  },
  {
    key: "gmv_cents", label: "Gross merchandise value", format: formatMoney, link: viewSales,
    help: <>Total rental price of those bookings, before the platform fee. Deposits and damage protection are excluded, since neither is a rental sale.</>,
  },
  {
    key: "platform_revenue_cents", label: "Platform revenue", format: formatMoney, link: viewSales,
    help: <>Platform fees charged on those bookings. Listing promotions and damage protection fees are not included.</>,
  },
  {
    key: "active_listings", label: "Active listings", format: (v) => v.toLocaleString("en-SG"),
    link: () => ({ href: `${ROUTES.listings}?status=ACTIVE` as Route, label: "View listings" }),
    help: <>Listings live now that were published by the end of the range. Listings archived or removed since are not counted, because listing status history is not kept.</>,
  },
  {
    key: "new_signups", label: "New sign-ups", format: (v) => v.toLocaleString("en-SG"),
    help: <>Accounts created in the range, by Singapore date.</>,
  },
  {
    key: "utilisation_pct", label: "Listing utilisation", format: (v) => `${v.toFixed(1)}%`,
    help: <>Days the active listings were booked within the range, divided by active listings × days in the range. A booking that starts or ends outside the range only counts its days inside it.</>,
  },
];

const DECLINE_REASONS: Record<string, string> = {
  DATES_UNAVAILABLE: "Dates unavailable",
  ITEM_UNAVAILABLE: "Item unavailable",
  RENTER_NOT_SUITABLE: "Renter not suitable",
  LOGISTICS: "Logistics",
  OTHER: "Other",
  NOT_GIVEN: "No reason given",
};

/** CAMPING_OUTDOOR → Camping outdoor. */
function categoryLabel(slug: string): string {
  const words = slug.toLowerCase().replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** A listing this much above its category's median rate is flagged as a likely price problem. */
const PRICE_FLAG_PCT = 20;

function Change({ metric, current, previous }: { metric: (typeof METRICS)[number]; current: number; previous: number }) {
  const diff = current - previous;
  if (diff === 0) return <>No change</>;
  const sign = diff > 0 ? "+" : "−";
  // Utilisation is already a percentage, so its change is in points rather than a percentage of a percentage.
  if (metric.key === "utilisation_pct") return <>{sign}{Math.abs(diff).toFixed(1)} pts</>;
  const amount = metric.format(Math.abs(diff));
  const pct = previous === 0 ? "new" : `${sign}${Math.abs((diff / previous) * 100).toFixed(1)}%`;
  return <>{sign}{amount} ({pct})</>;
}

function LostRequestsSection({ lost, range }: { lost: LostRequests; range: Range }) {
  const total = lost.declined + lost.expired;
  return <section className="mt-8">
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <h3 className="text-sm font-semibold">
        Lost requests
        <MetricHelp label="lost requests"><p>Requests made in the range that the owner declined, or never answered before they expired, valued at the rental price quoted to the renter. A bundle request counts once.</p></MetricHelp>
      </h3>
      {total > 0 && <Link href={bookingsHref(["DECLINED", "EXPIRED"], range)} className="text-sm underline underline-offset-4">View declined and expired requests</Link>}
    </div>
    {total === 0 ? <p className="mt-2 text-sm text-ink-soft">No requests were declined or left to expire in this range.</p> : <>
      <p className="mt-2 text-sm">
        <span className="font-semibold">{formatMoney(lost.declined_value_cents + lost.expired_value_cents)}</span> in rentals lost:{" "}
        {lost.declined} declined ({formatMoney(lost.declined_value_cents)}), {lost.expired} expired with no reply ({formatMoney(lost.expired_value_cents)}).
      </p>
      {lost.declines_by_reason.length > 0 && <p className="mt-1 text-xs text-ink-soft">
        Declined because: {lost.declines_by_reason.map((r) => `${DECLINE_REASONS[r.reason] ?? r.reason} (${r.count})`).join(", ")}
      </p>}
      <table className="mt-4 min-w-full text-left text-sm">
        <caption className="sr-only">Owners who lost the most requests</caption>
        <thead className="border-b border-line text-ink-soft">
          <tr><th className="py-2 pr-3 font-normal">Owner</th><th className="py-2 pr-3 font-normal">Declined</th><th className="py-2 pr-3 font-normal">Expired</th><th className="py-2 font-normal">Value lost</th></tr>
        </thead>
        <tbody>{lost.top_owners.map((o) => <tr key={o.owner_id} className="border-b border-line last:border-0">
          <td className="py-2 pr-3"><Link href={ROUTES.user(o.owner_id)} className="font-medium underline-offset-4 hover:underline">{o.display_name ?? o.email ?? "Unnamed owner"}</Link></td>
          <td className="py-2 pr-3">{o.declined}</td>
          <td className="py-2 pr-3">{o.expired}</td>
          <td className="py-2">{formatMoney(o.lost_value_cents)}</td>
        </tr>)}</tbody>
      </table>
    </>}
  </section>;
}

function ViewedNotBookedSection({ listings }: { listings: ViewedNotBookedListing[] }) {
  return <section className="mt-8">
    <h3 className="text-sm font-semibold">
      Viewed but not booked
      <MetricHelp label="viewed but not booked"><p>The ten most viewed live listings with no confirmed booking made in the range. Each daily rate is compared with the median daily rate of live listings in its category; weekly-only listings are compared at a seventh of their weekly rate. A rate more than {PRICE_FLAG_PCT}% above the median is flagged.</p></MetricHelp>
    </h3>
    {listings.length === 0 ? <p className="mt-2 text-sm text-ink-soft">Every listing viewed in this range was booked, or none were viewed.</p> :
      <table className="mt-4 min-w-full text-left text-sm">
        <caption className="sr-only">Most viewed listings with no booking</caption>
        <thead className="border-b border-line text-ink-soft">
          <tr><th className="py-2 pr-3 font-normal">Listing</th><th className="py-2 pr-3 font-normal">Category</th><th className="py-2 pr-3 font-normal">Views</th><th className="py-2 font-normal">Daily rate vs category median</th></tr>
        </thead>
        <tbody>{listings.map((l) => {
          const vsMedian = l.category_median_daily_rate_cents ? ((l.daily_rate_cents - l.category_median_daily_rate_cents) / l.category_median_daily_rate_cents) * 100 : 0;
          return <tr key={l.listing_id} className="border-b border-line last:border-0">
            <td className="py-2 pr-3"><Link href={ROUTES.listing(l.listing_id)} className="font-medium underline-offset-4 hover:underline">{l.name}</Link></td>
            <td className="py-2 pr-3">{categoryLabel(l.category)}</td>
            <td className="py-2 pr-3">{l.views}</td>
            <td className="py-2">
              {formatMoney(l.daily_rate_cents)} vs {formatMoney(l.category_median_daily_rate_cents)}
              {vsMedian > PRICE_FLAG_PCT && <span className="ml-2 font-medium text-bad">{Math.round(vsMedian)}% above</span>}
            </td>
          </tr>;
        })}</tbody>
      </table>}
  </section>;
}

/** S4-05: platform figures for a chosen range, each against the period of the same length before it, plus where demand was lost. */
export function PlatformMetricsPanel({ from, to, result }: { from: string; to: string; result: { data: PlatformMetrics } | { error: string } | null }) {
  const data = result && "data" in result ? result.data : null;
  const range = { from, to };
  return <Panel
    title="Platform overview"
    description={data ? `${formatDate(data.start)} to ${formatDate(data.end)}, compared with ${formatDate(data.previous_start)} to ${formatDate(data.previous_end)}.` : undefined}
    actions={<form method="get" className="flex flex-wrap items-end gap-3">
      <label className="text-xs text-ink-soft">From<Input type="date" name="from" defaultValue={from} required className="mt-1 w-auto" /></label>
      <label className="text-xs text-ink-soft">To<Input type="date" name="to" defaultValue={to} required className="mt-1 w-auto" /></label>
      <Button type="submit">Apply</Button>
    </form>}
  >
    {!result && <p role="alert" className="text-sm text-bad">Could not load platform metrics.</p>}
    {result && "error" in result && <p role="alert" className="text-sm text-bad">{result.error}</p>}
    {data && <>
      <dl className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
        {METRICS.map((metric) => {
          const link = metric.link?.(range);
          return <div key={metric.key} className="bg-white p-5">
            <dt className="text-sm text-ink-soft">{metric.label}<MetricHelp label={metric.label.toLowerCase()}><p>{metric.help}</p></MetricHelp></dt>
            <dd className="mt-2 text-2xl font-semibold">{metric.format(data.current[metric.key])}</dd>
            <dd className="mt-1 text-xs text-ink-soft"><Change metric={metric} current={data.current[metric.key]} previous={data.previous[metric.key]} /> vs previous period</dd>
            {link && <dd className="mt-3 text-xs"><Link href={link.href} className="underline underline-offset-4">{link.label}</Link></dd>}
          </div>;
        })}
      </dl>
      <LostRequestsSection lost={data.lost_requests} range={range} />
      <ViewedNotBookedSection listings={data.viewed_not_booked} />
    </>}
  </Panel>;
}
