import type { Route } from "next";
import Link from "next/link";
import { requirePortalSession } from "@/lib/admin";
import {
  OUTCOME_LABELS,
  PAGE_SIZE,
  RATING_FILTERS,
  REASON_LABELS,
  getAssistantSummary,
  listAssistantTurns,
  type AssistantOutcome,
  type AssistantTurn,
} from "@/lib/assistant";
import { formatDateTime } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { Badge, Container, EmptyState, Panel } from "@/components/ui";
import { HelpResyncForm } from "@/components/help-resync-form";
import { AssistantCorrectionForm } from "@/components/assistant-correction-form";
import { AssistantTabs } from "@/components/assistant-tabs";
import { Pagination } from "@/components/pagination";

export const metadata = { title: "Assistant — HobbyRentals Admin" };

const OUTCOMES = Object.keys(OUTCOME_LABELS) as AssistantOutcome[];
const OUTCOME_TONE: Record<AssistantOutcome, "positive" | "warning" | "critical" | "neutral"> = {
  ANSWERED: "positive",
  NOT_SURE: "warning",
  DECLINED: "neutral",
  UNAVAILABLE: "critical",
};
/** The web app, where the help sections an answer cited live. */
const WEB_APP_URL = (process.env.WEB_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");

type Search = { rating?: string; outcome?: string; page?: string };

function hrefFor(search: Search): Route {
  const query = new URLSearchParams(Object.entries(search).filter(([, value]) => value) as [string, string][]);
  const qs = query.toString();
  return `${ROUTES.assistant}${qs ? `?${qs}` : ""}` as Route;
}

function Turn({ turn }: { turn: AssistantTurn }) {
  const helpSlugs = turn.source_slugs.filter((slug) => !slug.startsWith("answer-"));
  return (
    <li id={`turn-${turn.id}`} className="scroll-mt-24 space-y-2 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{turn.question}</p>
        <div className="flex items-center gap-2">
          {turn.correction_id && <Badge tone="positive">Corrected</Badge>}
          {!turn.correction_id && turn.covered_by && turn.covered_similarity !== null && (
            <Badge tone="neutral">Close to a correction ({Math.round(turn.covered_similarity * 100)}%)</Badge>
          )}
          {turn.rating === -1 && <Badge tone="critical">Thumbs down{turn.reason ? `: ${REASON_LABELS[turn.reason]}` : ""}</Badge>}
          {turn.rating === 1 && <Badge tone="positive">Thumbs up</Badge>}
          <Badge tone={OUTCOME_TONE[turn.outcome]}>{OUTCOME_LABELS[turn.outcome]}</Badge>
        </div>
      </div>
      {turn.answer && <p className="body-copy whitespace-pre-line">{turn.answer}</p>}
      {turn.note && <p className="border-l-2 border-bad pl-3 text-sm">“{turn.note}”</p>}
      <p className="text-xs text-ink-soft">
        {formatDateTime(turn.created_at)} · {turn.intent.replace("_", " ")} · {turn.signed_in ? "signed in" : "visitor"}
        {turn.latency_ms !== null && ` · ${(turn.latency_ms / 1000).toFixed(1)} s`}
        {turn.listing_ids.length > 0 && ` · ${turn.listing_ids.length} listing${turn.listing_ids.length === 1 ? "" : "s"} shown`}
        {turn.source_slugs.map((slug) => (
          <span key={slug}>
            {" · "}
            <a
              href={slug.startsWith("answer-") ? `${WEB_APP_URL}/help/answers/${slug.slice(7)}` : `${WEB_APP_URL}/help#${slug}`}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-ink"
            >
              {slug}
            </a>
          </span>
        ))}
      </p>
      {/* S6-08 Scenario 2: a thumbs-down answer can be corrected once; later edits are under Approved answers. */}
      {turn.rating === -1 && !turn.correction_id && turn.question && (
        <AssistantCorrectionForm turnId={turn.id} question={turn.question} slugs={helpSlugs} />
      )}
    </li>
  );
}

/**
 * S5-06 Scenario 6: what the chat assistant was asked and what it answered,
 * with the thumbs up or down visitors gave. Thumbs down first is the useful
 * view: each one is either a gap in the help centre or an answer to fix.
 */
export default async function AssistantPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requirePortalSession();
  const search = await searchParams;
  const rating = RATING_FILTERS.some((filter) => filter.key === search.rating) ? (search.rating ?? "") : "";
  const outcome = OUTCOMES.includes(search.outcome as AssistantOutcome) ? (search.outcome ?? "") : "";
  const page = Math.max(1, Number.parseInt(search.page ?? "1", 10) || 1);
  const [{ items, total, error }, summary] = await Promise.all([
    listAssistantTurns({ rating, outcome, page }),
    getAssistantSummary(7),
  ]);

  return (
    <Container className="py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Support</p>
          <h1 className="display-caps mt-3 text-3xl">Chat assistant</h1>
        </div>
        <HelpResyncForm />
      </div>
      <AssistantTabs current={ROUTES.assistant} />

      {summary && (
        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { term: "Questions, last 7 days", value: summary.turns },
            { term: "Not sure or unavailable", value: summary.not_sure + summary.unavailable },
            { term: "Thumbs up", value: summary.thumbs_up },
            { term: "Thumbs down", value: summary.thumbs_down },
          ].map((item) => (
            <div key={item.term} className="border border-line bg-white px-4 py-3">
              <dt className="text-xs text-ink-soft">{item.term}</dt>
              <dd className="mt-1 text-2xl">{item.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
        <nav className="flex gap-4" aria-label="Rating">
          {RATING_FILTERS.map((filter) => (
            <Link
              key={filter.key}
              href={hrefFor({ rating: filter.key, outcome })}
              aria-current={rating === filter.key ? "page" : undefined}
              className={rating === filter.key ? "font-medium underline underline-offset-4" : "text-ink-soft hover:text-ink"}
            >
              {filter.label}
            </Link>
          ))}
        </nav>
        <nav className="flex gap-4" aria-label="Outcome">
          {[{ key: "", label: "Any outcome" }, ...OUTCOMES.map((key) => ({ key, label: OUTCOME_LABELS[key] }))].map((filter) => (
            <Link
              key={filter.key}
              href={hrefFor({ rating, outcome: filter.key })}
              aria-current={outcome === filter.key ? "page" : undefined}
              className={outcome === filter.key ? "font-medium underline underline-offset-4" : "text-ink-soft hover:text-ink"}
            >
              {filter.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        <Panel title="Answers" description={error ?? `${total} answer${total === 1 ? "" : "s"}, newest first. Kept for 90 days.`}>
          {items.length === 0 ? (
            <div className="-mx-6 -my-5">
              <EmptyState title="No answers here" body="Nothing matches these filters yet." />
            </div>
          ) : (
            <ul className="-my-4 divide-y divide-line">
              {items.map((turn) => (
                <Turn key={turn.id} turn={turn} />
              ))}
            </ul>
          )}
        </Panel>
        <Pagination page={page} lastPage={Math.max(1, Math.ceil(total / PAGE_SIZE))} hrefForPage={(p) => hrefFor({ rating, outcome, page: String(p) })} />
      </div>
    </Container>
  );
}
