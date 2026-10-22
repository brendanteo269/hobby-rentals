"use client";

import Link from "next/link";
import type { Route } from "next";
import { Megaphone, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { ButtonLink, EmptyState, ImageSlot } from "@/components/ui";
import { PromotedBadge } from "@/components/listings/promoted-badge";
import { CATEGORY_LABELS, type Listing } from "@/lib/listings";
import { formatMoney } from "@/lib/format";
import { ownerInsightsPath } from "@/lib/routes";
import type { InsightsPeriod, ListingInsight, OwnerInsights } from "@/lib/owner-insights";

const PERIODS: { value: InsightsPeriod; label: string }[] = [
  { value: "30d", label: "Last 30 days" },
  { value: "3m", label: "Last 3 months" },
  { value: "12m", label: "Last 12 months" },
];

function MetricCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="card p-5"><p className="text-sm font-semibold text-ink">{label}</p><p className="heading mt-3 text-3xl">{value}</p>{detail && <p className="mt-2 text-xs text-ink-soft">{detail}</p>}</div>;
}

function actionHref(item: ListingInsight): Route {
  if (item.action === "availability") return `/listings/${item.listing_id}/edit#availability` as Route;
  if (item.action === "price") return `/listings/${item.listing_id}/edit#price` as Route;
  if (item.action === "edit") return `/listings/${item.listing_id}/edit` as Route;
  return `/listings/${item.listing_id}` as Route;
}

function actionLabel(item: ListingInsight): string {
  if (item.action === "availability") return "Edit availability";
  if (item.action === "price") return "Review price";
  if (item.action === "edit") return "Edit listing";
  return "View listing";
}

function ListingInsightCard({ item, listing }: { item: ListingInsight; listing?: Listing }) {
  return <article className="group flex h-full flex-col overflow-hidden card transition-colors hover:border-ink-soft">
    <div className="relative overflow-hidden">
      <ImageSlot label={listing?.photo_keys[0] ?? "Listing image"} src={listing?.photo_urls[0]} className="aspect-square w-full transition-transform duration-300 ease-out group-hover:scale-105" />
      <PromotedBadge promoted={listing?.is_promoted} className="absolute right-3 top-3" />
    </div>
    <div className="flex min-w-0 flex-1 flex-col p-4">
      <h3 className="heading text-base">{item.listing_name}</h3>
      <div className="mt-4"><p className="text-xs text-ink-soft">Settled earnings</p><p className="heading mt-1 text-2xl">{formatMoney(item.settled_earnings_cents)}</p></div>
      <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-3 text-xs"><div><dt className="text-ink-soft">Clicks</dt><dd className="mt-1">{item.listing_opens}</dd></div><div><dt className="text-ink-soft">Completed rentals</dt><dd className="mt-1">{item.completed_rentals}</dd></div></dl>
      {item.insight && <p className="mt-4 text-sm text-ink-soft">{item.insight}</p>}
      {/* mt-auto: actions line up across a row whatever the insight's length. */}
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 text-sm font-medium">
        <Link href={actionHref(item)} className="w-fit underline underline-offset-4">{actionLabel(item)}</Link>
        {/* S3-28: only a published listing without a running promotion can be promoted. */}
        {listing?.status === "ACTIVE" && !listing.is_promoted && <Link href={`/listings/${item.listing_id}/promotion` as Route} className="inline-flex w-fit items-center gap-1 underline underline-offset-4"><Megaphone className="h-3.5 w-3.5" aria-hidden />Promote</Link>}
      </div>
    </div>
  </article>;
}

function Group({ title, body, items, listings }: { title: string; body: string; items: ListingInsight[]; listings: Listing[] }) {
  if (items.length === 0) return null;
  return <section><div><p className="eyebrow">Your listings</p><h2 className="heading mt-1 text-xl">{title}</h2><p className="body-copy mt-1">{body}</p></div><div className="mt-4 grid gap-3 lg:grid-cols-3">{items.map((item) => <ListingInsightCard key={item.listing_id} item={item} listing={listings.find((listing) => listing.id === item.listing_id)} />)}</div></section>;
}

function trendLabel(periodStart: string, period: InsightsPeriod): string {
  const start = new Date(`${periodStart}T00:00:00+08:00`);
  if (period !== "30d") return start.toLocaleDateString("en-SG", { month: "short" });
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startLabel = start.toLocaleDateString("en-SG", { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString("en-SG", { month: "short", day: "numeric" });
  return `${startLabel}–${endLabel}`;
}

function Trend({ insights }: { insights: OwnerInsights }) {
  const max = Math.max(...insights.earnings_trend.map((point) => point.settled_earnings_cents), 1);
  const [tooltip, setTooltip] = useState<{ point: OwnerInsights["earnings_trend"][number]; x: number; y: number } | null>(null);
  return <section className="flex h-full flex-col card p-5"><p className="eyebrow">Earnings trend</p><h2 className="heading mt-1 text-xl">Settled rental earnings</h2><p className="body-copy mt-1">Based on settlements in this period. Hover or focus a bar to see its sources.</p><div className="mt-6 flex min-h-44 flex-1 items-end gap-2" aria-label="Settled rental earnings trend"><div className="sr-only">Weekly for 30 days, monthly for longer periods. Amounts are in Singapore dollars.</div>{insights.earnings_trend.map((point) => <div key={point.period_start} className="group flex min-w-0 flex-1 self-stretch flex-col justify-end gap-2"><span className="text-center text-[10px] text-ink-soft">{formatMoney(point.settled_earnings_cents)}</span><button type="button" onPointerMove={(event) => setTooltip({ point, x: event.clientX + 12, y: event.clientY + 12 })} onPointerLeave={() => setTooltip(null)} onFocus={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); setTooltip({ point, x: bounds.right + 12, y: bounds.top + 12 }); }} onBlur={() => setTooltip(null)} className="w-full bg-accent transition-colors hover:bg-accent-dark focus-visible:bg-accent-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink" style={{ height: `${Math.max(4, Math.round((point.settled_earnings_cents / max) * 100))}%` }} aria-label={`${trendLabel(point.period_start, insights.period)}: ${formatMoney(point.settled_earnings_cents)} settled rental earnings`}><span className="sr-only">Show earnings sources</span></button><span className="text-center text-[10px] leading-tight text-ink-soft">{trendLabel(point.period_start, insights.period)}</span></div>)}</div>{tooltip && <div role="tooltip" className="pointer-events-none fixed z-50 w-56 card p-3 text-left text-xs shadow-lg" style={{ left: tooltip.x, top: tooltip.y }}><p className="font-semibold">{trendLabel(tooltip.point.period_start, insights.period)}</p><p className="mt-1 text-ink-soft">{formatMoney(tooltip.point.settled_earnings_cents)} settled rental earnings</p>{tooltip.point.sources.length > 0 ? <ul className="mt-2 space-y-1 border-t border-line pt-2">{tooltip.point.sources.map((source) => <li key={source.name} className="flex justify-between gap-3"><span className="min-w-0 truncate">{source.name}</span><span className="shrink-0 font-medium">{formatMoney(source.earnings_cents)}</span></li>)}</ul> : <p className="mt-2 border-t border-line pt-2 text-ink-soft">No settled earnings in this period.</p>}</div>}</section>;
}

function MarketDemand({ insights, listings }: { insights: OwnerInsights; listings: Listing[] }) {
  if (insights.market_demand.length === 0) return null;
  const labels = new Map(listings.filter((listing) => listing.status === "ACTIVE").map((listing) => [listing.category, CATEGORY_LABELS[listing.category]]));
  return <section className="card p-5"><p className="eyebrow">Market demand</p><h2 className="heading mt-1 text-xl">Renter search interest in your active listing categories</h2><p className="body-copy mt-1">Category searches show market interest, not guaranteed bookings or listing impressions.</p><ul className="mt-5 divide-y divide-line">{insights.market_demand.map((row) => <li key={row.category} className="flex items-center justify-between gap-3 py-3 text-sm"><div className="min-w-0"><p>{labels.get(row.category) ?? row.category}</p>{row.trend_available && row.change_percent !== null && (row.change_percent >= 0 ? <p className="mt-1 flex items-center gap-1 text-xs text-accent-dark" title={`${row.change_percent}% higher than the prior period`}><TrendingUp className="size-4" aria-hidden="true" /><span className="sr-only">Rising: </span>Rising {row.change_percent > 0 ? "+" : ""}{row.change_percent}%</p> : <p className="mt-1 flex items-center gap-1 text-xs text-ink-soft" title={`${Math.abs(row.change_percent)}% lower than the prior period`}><TrendingDown className="size-4" aria-hidden="true" /><span className="sr-only">Falling: </span>Falling {row.change_percent}%</p>)}</div><p className="shrink-0 text-right"><strong>{row.searches}</strong> searches</p></li>)}</ul></section>;
}

export function OwnerInsightsDashboard({ insights, listings }: { insights: OwnerInsights; listings: Listing[] }) {
  if (listings.length === 0) return <EmptyState title="No listings yet" body="Create a listing to start tracking rental performance and renter interest." action={<ButtonLink href="/listings/new">Create a listing</ButtonLink>} />;
  return <div className="space-y-10"><section><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Owner insights</p><h2 className="heading mt-2 text-2xl">Your rental business</h2><p className="body-copy mt-2">Historical performance and practical next steps for your listings.</p></div><div className="flex rounded-full border border-line bg-white p-1">{PERIODS.map((option) => <Link key={option.value} href={ownerInsightsPath(option.value)} className={`rounded-full px-3 py-1.5 text-xs ${option.value === insights.period ? "bg-ink text-white" : "text-ink-soft hover:text-ink"}`}>{option.label}</Link>)}</div></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><MetricCard label="Settled rental earnings" value={formatMoney(insights.summary.settled_earnings_cents)} detail={insights.summary.includes_bundle_rentals ? "Includes bundle rentals" : undefined} /><MetricCard label="Completed rentals" value={String(insights.summary.completed_rentals)} /><MetricCard label="Listing clicks" value={String(insights.summary.listing_opens)} /></div>{insights.bundle_rentals.completed_rentals > 0 && <div className="mt-3 border border-line bg-surface-muted p-4 text-sm"><span className="font-medium">Bundle rentals</span><span className="ml-3 text-ink-soft">{insights.bundle_rentals.completed_rentals} completed · {formatMoney(insights.bundle_rentals.settled_earnings_cents)} settled rental earnings</span></div>}</section><div className="grid gap-6 lg:grid-cols-2"><Trend insights={insights} /><MarketDemand insights={insights} listings={listings} /></div><div className="space-y-10"><Group title="Top earners" body="Listings with the strongest settled single-listing rental earnings." items={insights.listing_groups.top_earners} listings={listings} /><Group title="Needs attention" body="A few practical prompts based on availability, renter interest, and recent rental outcomes." items={insights.listing_groups.needs_attention} listings={listings} /><Group title="Most viewed" body="Listings receiving the most renter interest that are not already shown above." items={insights.listing_groups.most_viewed} listings={listings} /></div></div>;
}
