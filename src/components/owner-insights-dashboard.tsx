import Link from "next/link";
import type { Route } from "next";
import { ButtonLink, EmptyState, ImageSlot } from "@/components/ui";
import { CATEGORY_LABELS, LISTING_STATUS_LABELS, type Listing } from "@/lib/listings";
import { formatMoney } from "@/lib/format";
import type { InsightsPeriod, ListingInsight, OwnerInsights } from "@/lib/owner-insights";

const PERIODS: { value: InsightsPeriod; label: string }[] = [
  { value: "30d", label: "Last 30 days" },
  { value: "3m", label: "Last 3 months" },
  { value: "12m", label: "Last 12 months" },
];

function ownerPath(period: InsightsPeriod): Route {
  return `/profile?view=owner&period=${period}` as Route;
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="border border-line bg-white p-5"><p className="text-xs text-ink-soft">{label}</p><p className="heading mt-2 text-2xl">{value}</p>{detail && <p className="mt-2 text-xs text-ink-soft">{detail}</p>}</div>;
}

function actionHref(item: ListingInsight): Route {
  if (item.action === "availability") return `/listings/${item.listing_id}/availability` as Route;
  if (item.action === "price") return `/listings/${item.listing_id}/edit#price` as Route;
  if (item.action === "edit") return `/listings/${item.listing_id}/edit` as Route;
  return `/listings/${item.listing_id}` as Route;
}

function actionLabel(item: ListingInsight): string {
  if (item.action === "availability") return "Manage availability";
  if (item.action === "price") return "Review price";
  if (item.action === "edit") return "Edit listing";
  return "View listing";
}

function ListingInsightCard({ item, listing }: { item: ListingInsight; listing?: Listing }) {
  return <article className="overflow-hidden border border-line bg-white sm:flex">
    <ImageSlot label={listing?.photo_keys[0] ?? "Listing image"} src={listing?.photo_urls[0]} className="aspect-[4/3] w-full sm:w-40" />
    <div className="flex min-w-0 flex-1 flex-col p-4">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-ink-soft">{LISTING_STATUS_LABELS[item.listing_status as keyof typeof LISTING_STATUS_LABELS] ?? item.listing_status}</p><h3 className="heading mt-1 text-base">{item.listing_name}</h3></div><p className="text-right text-xs text-ink-soft">{formatMoney(item.settled_earnings_cents)} earned</p></div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-xs"><div><dt className="text-ink-soft">Opens</dt><dd className="mt-1 font-medium">{item.listing_opens}</dd></div><div><dt className="text-ink-soft">Rentals</dt><dd className="mt-1 font-medium">{item.completed_rentals}</dd></div><div><dt className="text-ink-soft">Earnings</dt><dd className="mt-1 font-medium">{formatMoney(item.settled_earnings_cents)}</dd></div></dl>
      {item.insight && <p className="mt-4 text-sm text-ink-soft">{item.insight}. Consider reviewing the listing, price recommendation, or availability.</p>}
      <Link href={actionHref(item)} className="mt-4 w-fit text-sm font-medium underline underline-offset-4">{actionLabel(item)}</Link>
    </div>
  </article>;
}

function Group({ title, body, items, listings }: { title: string; body: string; items: ListingInsight[]; listings: Listing[] }) {
  if (items.length === 0) return null;
  return <section><div><p className="eyebrow">Your listings</p><h2 className="heading mt-1 text-xl">{title}</h2><p className="body-copy mt-1">{body}</p></div><div className="mt-4 grid gap-3 lg:grid-cols-3">{items.map((item) => <ListingInsightCard key={item.listing_id} item={item} listing={listings.find((listing) => listing.id === item.listing_id)} />)}</div></section>;
}

function Trend({ insights }: { insights: OwnerInsights }) {
  const max = Math.max(...insights.earnings_trend.map((point) => point.settled_earnings_cents), 1);
  return <section className="border border-line bg-white p-5"><p className="eyebrow">Earnings trend</p><h2 className="heading mt-1 text-xl">Settled rental earnings</h2><p className="body-copy mt-1">Based on settlements in this period.</p><div className="mt-6 flex h-36 items-end gap-2" aria-label="Settled rental earnings trend"><div className="sr-only">Weekly for 30 days, monthly for longer periods. Amounts are in Singapore dollars.</div>{insights.earnings_trend.map((point) => <div key={point.period_start} className="flex min-w-0 flex-1 flex-col items-center gap-2"><div className="w-full bg-accent" style={{ height: `${Math.max(4, Math.round((point.settled_earnings_cents / max) * 100))}%` }} title={`${point.period_start}: ${formatMoney(point.settled_earnings_cents)}`} /><span className="text-[10px] text-ink-soft">{new Date(`${point.period_start}T00:00:00+08:00`).toLocaleDateString("en-SG", { month: "short", day: insights.period === "30d" ? "numeric" : undefined })}</span></div>)}</div></section>;
}

function MarketDemand({ insights, listings }: { insights: OwnerInsights; listings: Listing[] }) {
  if (insights.market_demand.length === 0) return null;
  const labels = new Map(listings.filter((listing) => listing.status === "ACTIVE").map((listing) => [listing.category, CATEGORY_LABELS[listing.category]]));
  return <section className="border border-line bg-white p-5"><p className="eyebrow">Market demand</p><h2 className="heading mt-1 text-xl">Renter search interest in your active listing categories</h2><p className="body-copy mt-1">Category searches show market interest, not guaranteed bookings or listing impressions.</p><ul className="mt-5 divide-y divide-line">{insights.market_demand.map((row) => <li key={row.category} className="flex items-center justify-between gap-3 py-3 text-sm"><span>{labels.get(row.category) ?? row.category}</span><span className="text-right"><strong>{row.searches}</strong> searches{row.trend_available && row.change_percent !== null ? <span className="ml-2 text-ink-soft">{row.change_percent > 0 ? "+" : ""}{row.change_percent}% vs prior period</span> : <span className="ml-2 text-ink-soft">Trend unavailable</span>}</span></li>)}</ul></section>;
}

export function OwnerInsightsDashboard({ insights, listings }: { insights: OwnerInsights; listings: Listing[] }) {
  if (listings.length === 0) return <EmptyState title="No listings yet" body="Create a listing to start tracking rental performance and renter interest." action={<ButtonLink href="/listings/new">Create a listing</ButtonLink>} />;
  return <div className="space-y-10"><section><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Owner insights</p><h2 className="heading mt-2 text-2xl">Your rental business</h2><p className="body-copy mt-2">Historical performance and practical next steps for your listings.</p></div><div className="flex rounded-full border border-line bg-white p-1">{PERIODS.map((option) => <Link key={option.value} href={ownerPath(option.value)} className={`rounded-full px-3 py-1.5 text-xs ${option.value === insights.period ? "bg-ink text-white" : "text-ink-soft hover:text-ink"}`}>{option.label}</Link>)}</div></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><MetricCard label="Settled rental earnings" value={formatMoney(insights.summary.settled_earnings_cents)} detail={insights.summary.includes_bundle_rentals ? "Includes bundle rentals" : "Rental earnings after commission"} /><MetricCard label="Completed rentals" value={String(insights.summary.completed_rentals)} detail="Final settlements only" /><MetricCard label="Listing opens" value={String(insights.summary.listing_opens)} detail="Deduplicated daily per renter" /></div>{insights.bundle_rentals.completed_rentals > 0 && <div className="mt-3 border border-line bg-surface-muted p-4 text-sm"><span className="font-medium">Bundle rentals</span><span className="ml-3 text-ink-soft">{insights.bundle_rentals.completed_rentals} completed · {formatMoney(insights.bundle_rentals.settled_earnings_cents)} settled rental earnings</span></div>}</section><div className="grid gap-6 lg:grid-cols-2"><Trend insights={insights} /><MarketDemand insights={insights} listings={listings} /></div><div className="space-y-10"><Group title="Needs attention" body="A few practical prompts based on availability, renter interest, and recent rental outcomes." items={insights.listing_groups.needs_attention} listings={listings} /><Group title="Top earners" body="Listings with the strongest settled single-listing rental earnings." items={insights.listing_groups.top_earners} listings={listings} /><Group title="Most viewed" body="Listings receiving the most renter interest that are not already shown above." items={insights.listing_groups.most_viewed} listings={listings} /></div></div>;
}
