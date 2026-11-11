import type { Route } from "next";
import Link from "next/link";
import { requirePortalSession } from "@/lib/admin";
import { PAGE_SIZE, listApprovedAnswers, type ApprovedAnswer } from "@/lib/assistant";
import { formatDate } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { Badge, Container, EmptyState, Panel } from "@/components/ui";
import { ApprovedAnswerForm } from "@/components/approved-answer-form";
import { AssistantTabs } from "@/components/assistant-tabs";
import { Pagination } from "@/components/pagination";
import { PromoteAnswersForm } from "@/components/promote-answers-form";

export const metadata = { title: "Approved answers — HobbyRentals Admin" };

/** The web app, where a correction is published for the assistant to cite. */
const WEB_APP_URL = (process.env.WEB_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");

const KIND_FILTERS = [
  { key: "", label: "All" },
  { key: "CORRECTION", label: "Corrections" },
  { key: "EXAMPLE", label: "Examples" },
] as const;
const STATUS_FILTERS = [
  { key: "APPROVED", label: "In use" },
  { key: "RETIRED", label: "Retired" },
  { key: "", label: "Any status" },
] as const;

type Search = { kind?: string; status?: string; page?: string };

function hrefFor(search: Search): Route {
  const query = new URLSearchParams(Object.entries(search).filter(([, value]) => value !== undefined) as [string, string][]);
  const qs = query.toString();
  return `${ROUTES.assistantAnswers}${qs ? `?${qs}` : ""}` as Route;
}

function Answer({ answer }: { answer: ApprovedAnswer }) {
  const support = answer.support;
  return (
    <li className="space-y-2 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{answer.title}</p>
        <div className="flex items-center gap-2">
          {answer.needs_review && answer.status === "APPROVED" && <Badge tone="warning">Help section changed: review</Badge>}
          <Badge tone={answer.kind === "CORRECTION" ? "neutral" : "positive"}>{answer.kind === "CORRECTION" ? "Correction" : "Example"}</Badge>
          <Badge tone={answer.status === "APPROVED" ? "positive" : "critical"}>{answer.status === "APPROVED" ? "In use" : "Retired"}</Badge>
        </div>
      </div>
      {answer.question !== answer.title && <p className="text-sm text-ink-soft">For: {answer.question}</p>}
      <p className="body-copy whitespace-pre-line">{answer.answer}</p>
      <p className="text-xs text-ink-soft">
        Updated {formatDate(answer.updated_at)}
        {answer.related_slugs.length > 0 && ` · relies on ${answer.related_slugs.join(", ")}`}
        {answer.kind === "EXAMPLE" && support && ` · thumbs up from ${support.members ?? 0} signed-in members (${support.thumbs_up ?? 0} in all)`}
        {support?.retired_because && ` · retired because ${support.retired_because}`}
        {answer.kind === "CORRECTION" && answer.status === "APPROVED" && (
          <>
            {" · "}
            <a href={`${WEB_APP_URL}/help/answers/${answer.short_id}`} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">
              /help/answers/{answer.short_id}
            </a>
          </>
        )}
      </p>
      <ApprovedAnswerForm answer={answer} />
    </li>
  );
}

/**
 * S6-08: what the chat assistant has learned from feedback. Corrections are
 * admins' answers to thumbs-down questions, used as sources and cited.
 * Examples are answers members rated well, promoted nightly and used only
 * to show the assistant a good answer's shape. Retiring either stops its use.
 */
export default async function ApprovedAnswersPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requirePortalSession();
  const search = await searchParams;
  const kind = KIND_FILTERS.some((filter) => filter.key === search.kind) ? (search.kind ?? "") : "";
  const status = search.status === undefined ? "APPROVED" : STATUS_FILTERS.some((filter) => filter.key === search.status) ? search.status : "APPROVED";
  const page = Math.max(1, Number.parseInt(search.page ?? "1", 10) || 1);
  const { items, total, error } = await listApprovedAnswers({ kind, status, page });

  return (
    <Container className="py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Support</p>
          <h1 className="display-caps mt-3 text-3xl">Chat assistant</h1>
        </div>
        <PromoteAnswersForm />
      </div>
      <AssistantTabs current={ROUTES.assistantAnswers} />

      <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
        {[
          { label: "Kind", filters: KIND_FILTERS, current: kind, href: (key: string) => hrefFor({ kind: key, status }) },
          { label: "Status", filters: STATUS_FILTERS, current: status, href: (key: string) => hrefFor({ kind, status: key }) },
        ].map((group) => (
          <nav key={group.label} className="flex gap-4" aria-label={group.label}>
            {group.filters.map((filter) => (
              <Link
                key={filter.key}
                href={group.href(filter.key)}
                aria-current={group.current === filter.key ? "page" : undefined}
                className={group.current === filter.key ? "font-medium underline underline-offset-4" : "text-ink-soft hover:text-ink"}
              >
                {filter.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>

      <div className="mt-6">
        <Panel title="Approved answers" description={error ?? `${total} answer${total === 1 ? "" : "s"}. Those whose help section changed come first.`}>
          {items.length === 0 ? (
            <div className="-mx-6 -my-5">
              <EmptyState title="Nothing here yet" body="Write a correction from a thumbs-down answer, or wait for answers members rate well." />
            </div>
          ) : (
            <ul className="-my-4 divide-y divide-line">
              {items.map((answer) => (
                <Answer key={answer.id} answer={answer} />
              ))}
            </ul>
          )}
        </Panel>
        <Pagination page={page} lastPage={Math.max(1, Math.ceil(total / PAGE_SIZE))} hrefForPage={(p) => hrefFor({ kind, status, page: String(p) })} />
      </div>
    </Container>
  );
}
