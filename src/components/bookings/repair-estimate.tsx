import type { ConditionScan } from "@/lib/condition-scans";
import { DAMAGE_TYPE_LABELS, SEVERITY_LABELS } from "@/lib/condition-scans";
import type { PriceSource, RepairEstimate } from "@/lib/settlement";
import { formatMoney } from "@/lib/format";

function Sources({ sources }: { sources: PriceSource[] }) {
  return (
    <ul className="mt-1 space-y-0.5 text-xs">
      {sources.map((source) => (
        <li key={source.url}>
          <a href={source.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            {source.site}
          </a>
          <span className="text-ink-soft"> · {formatMoney(source.price_cents)} · {source.title}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * S4-08: how the AI worked out a repair cost - each finding with its photo,
 * cost and the web prices behind it, the adjustments, and what a used one
 * sells for. The owner sees it on the claim form; the renter sees the same
 * breakdown, with the owner's figure against it, on the claim.
 */
export function RepairEstimateBreakdown({
  estimate,
  scan,
  claimedCents,
  onUseMarketValue,
}: {
  estimate: RepairEstimate;
  scan: ConditionScan | null;
  /** The renter's view: the owner's claimed figure, set against the estimate. */
  claimedCents?: number;
  /** The owner's view: claim the market value instead when repair is uneconomical. */
  onUseMarketValue?: (cents: number) => void;
}) {
  const diffMap = (angle: string) => scan?.angles.find((candidate) => candidate.angle === angle);
  const above = claimedCents != null ? claimedCents - estimate.total_cents : 0;
  return (
    <section aria-labelledby="estimate-heading" className="space-y-4 rounded-xl border border-line px-4 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="estimate-heading" className="text-base font-semibold">
          AI repair estimate{" "}
          <span className="ml-1 rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium">AI estimate</span>
        </h3>
        <p className="text-sm">
          <span className="font-semibold">{formatMoney(estimate.total_cents)}</span>
          <span className="text-ink-soft">
            {" "}
            · likely {formatMoney(estimate.low_cents)} to {formatMoney(estimate.high_cents)}
          </span>
        </p>
      </div>
      {!estimate.web_prices_found && (
        <p className="text-sm font-medium">No web prices found, AI estimate only.</p>
      )}
      {claimedCents != null && (
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-soft">Owner claims</dt>
            <dd className={`text-lg font-semibold ${above > 0 ? "text-accent" : ""}`}>{formatMoney(claimedCents)}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">AI estimate</dt>
            <dd className="text-lg font-semibold">{formatMoney(estimate.total_cents)}</dd>
          </div>
          {above > 0 && (
            <p className="text-sm text-accent sm:col-span-2">
              {formatMoney(above)} more than the AI estimate
              {claimedCents! > estimate.high_cents && `, and above the top of its range (${formatMoney(estimate.high_cents)})`}.
            </p>
          )}
        </dl>
      )}
      <ul className="divide-y divide-line">
        {estimate.items.map((item) => {
          const angle = diffMap(item.angle);
          return (
            <li key={`${item.angle}-${item.number}`} className="flex gap-3 py-3">
              {angle?.diff_map_url && (
                <a href={angle.diff_map_url} target="_blank" rel="noreferrer" className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a short-lived presigned URL */}
                  <img
                    src={angle.diff_map_url}
                    alt={`${angle.label} with finding ${item.number} marked`}
                    className="h-16 w-16 rounded-lg border border-line object-cover"
                  />
                </a>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">
                    #{item.number} {angle?.label ?? item.angle} · {DAMAGE_TYPE_LABELS[item.damage_type]}
                    {item.severity && ` · ${SEVERITY_LABELS[item.severity]}`}
                  </p>
                  <p className="text-sm font-semibold">
                    {item.is_wear ? <span className="font-normal text-ink-soft">Wear, not claimable</span> : formatMoney(item.cost_cents)}
                  </p>
                </div>
                <p className="text-sm text-ink-soft">{item.summary}</p>
                {!item.is_wear &&
                  (item.from_web ? (
                    <Sources sources={item.sources} />
                  ) : (
                    <p className="mt-1 text-xs text-ink-soft">
                      AI&apos;s own range, {formatMoney(item.low_cents)} to {formatMoney(item.high_cents)}
                      {item.work ? `, assuming: ${item.work.replace(/\.$/, "")}` : ""}. No repair prices found on the web.
                    </p>
                  ))}
              </div>
            </li>
          );
        })}
      </ul>
      {(estimate.condition_note || estimate.cap_note) && (
        <ul className="space-y-1 text-sm text-ink-soft">
          {estimate.condition_note && <li>{estimate.condition_note}</li>}
          {estimate.cap_note && (
            <li>
              {estimate.cap_note}
              {estimate.replacement_value_cents != null && ` (${formatMoney(estimate.replacement_value_cents)})`}
            </li>
          )}
        </ul>
      )}
      {estimate.uneconomical && estimate.market_value_cents != null && (
        <div className="rounded-lg border-l-2 border-accent bg-accent-soft px-3 py-2 text-sm">
          <p>
            <span className="font-medium">Uneconomical to repair.</span> Fixing it would cost more than a used one sells for (
            {formatMoney(estimate.market_value_cents)}).
          </p>
          {onUseMarketValue && (
            <button
              type="button"
              className="mt-1 font-medium underline underline-offset-2"
              onClick={() => onUseMarketValue(estimate.market_value_cents!)}
            >
              Claim the market value instead ({formatMoney(estimate.market_value_cents)})
            </button>
          )}
        </div>
      )}
      <details className="text-sm">
        <summary className="cursor-pointer font-medium">What the item is worth</summary>
        {estimate.comparables.length ? (
          <div className="mt-2">
            <p>
              Market value: <span className="font-semibold">{formatMoney(estimate.market_value_cents ?? 0)}</span>
              <span className="text-ink-soft">
                , the median of {estimate.comparables.length} second-hand listing{estimate.comparables.length === 1 ? "" : "s"} found on the web.
              </span>
            </p>
            <Sources sources={estimate.comparables} />
          </div>
        ) : (
          <p className="mt-2 text-ink-soft">No second-hand listings of this item were found on the web.</p>
        )}
      </details>
    </section>
  );
}
