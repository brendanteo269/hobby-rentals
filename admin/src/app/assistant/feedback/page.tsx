import { requirePortalSession } from "@/lib/admin";
import { REASON_LABELS, getFeedbackReport, type FeedbackReason } from "@/lib/assistant";
import { formatDate, formatDateTime } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { Container, EmptyState, Panel } from "@/components/ui";
import { AssistantCorrectionForm } from "@/components/assistant-correction-form";
import { AssistantTabs } from "@/components/assistant-tabs";

export const metadata = { title: "Assistant feedback — HobbyRentals Admin" };

const WEEKS = 8;

function Reasons({ reasons }: { reasons: Partial<Record<FeedbackReason | "NONE", number>> }) {
  const entries = Object.entries(reasons).sort(([, a], [, b]) => (b ?? 0) - (a ?? 0)) as [FeedbackReason | "NONE", number][];
  return <span>{entries.map(([reason, count]) => `${REASON_LABELS[reason] ?? reason} ${count}`).join(" · ")}</span>;
}

function percent(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}

/**
 * S6-08 Scenario 5: where the assistant is falling short. The topics most
 * often given a thumbs down this week, the thumbs-up rate week by week, and
 * the thumbs-down questions with no correction yet - rewordings grouped, the
 * most asked first, each correctable from here.
 */
export default async function AssistantFeedbackPage() {
  await requirePortalSession();
  const report = await getFeedbackReport(WEEKS);

  return (
    <Container className="py-12">
      <div>
        <p className="eyebrow">Support</p>
        <h1 className="display-caps mt-3 text-3xl">Chat assistant</h1>
      </div>
      <AssistantTabs current={ROUTES.assistantFeedback} />

      {"error" in report ? (
        <p role="alert" className="mt-6 border-l-2 border-bad bg-sand px-3 py-2 text-sm">{report.error}</p>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Thumbs-down topics" description="The last 7 days, most first.">
              {report.top_down_topics.length === 0 ? (
                <p className="body-copy">No thumbs down in the last 7 days.</p>
              ) : (
                <ol className="space-y-3">
                  {report.top_down_topics.map((topic) => (
                    <li key={topic.topic} className="flex items-baseline justify-between gap-4 text-sm">
                      <div>
                        <p className="font-medium">{topic.topic}</p>
                        <p className="text-xs text-ink-soft"><Reasons reasons={topic.reasons} /></p>
                      </div>
                      <span className="text-lg tabular-nums">{topic.count}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>

            <Panel title="Thumbs-up rate by week" description={`Share of rated answers given a thumbs up, last ${WEEKS} weeks.`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink-soft">
                    <th scope="col" className="pb-2 font-normal">Week of</th>
                    <th scope="col" className="pb-2 text-right font-normal">Up</th>
                    <th scope="col" className="pb-2 text-right font-normal">Down</th>
                    <th scope="col" className="pb-2 text-right font-normal">Thumbs-up rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {[...report.weekly].reverse().map((week) => (
                    <tr key={week.week}>
                      <td className="py-1.5">{formatDate(week.week)}</td>
                      <td className="py-1.5 text-right tabular-nums">{week.up}</td>
                      <td className="py-1.5 text-right tabular-nums">{week.down}</td>
                      <td className="py-1.5 text-right font-medium tabular-nums">{percent(week.up_rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </div>

          <Panel
            title="No correction yet"
            description={`${report.uncorrected_total} thumbs-down answer${report.uncorrected_total === 1 ? "" : "s"} in the last 30 days that no correction covers. Rewordings of one question are grouped; the most asked come first.`}
          >
            {report.uncorrected.length === 0 ? (
              <div className="-mx-6 -my-5">
                <EmptyState title="All caught up" body="Every thumbs-down question from the last 30 days has a correction." />
              </div>
            ) : (
              <ul className="-my-4 divide-y divide-line">
                {report.uncorrected.map((group) => (
                  <li key={group.latest_turn_id} className="space-y-2 py-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-medium">{group.question}</p>
                      <span className="text-sm text-ink-soft">{group.count} thumbs down</span>
                    </div>
                    {group.other_questions.length > 0 && <p className="text-xs text-ink-soft">Also asked as: {group.other_questions.join(" · ")}</p>}
                    {group.notes.map((note) => (
                      <p key={note} className="border-l-2 border-bad pl-3 text-sm">“{note}”</p>
                    ))}
                    <p className="text-xs text-ink-soft">
                      <Reasons reasons={group.reasons} /> · latest {formatDateTime(group.latest_at)}
                    </p>
                    <AssistantCorrectionForm turnId={group.latest_turn_id} question={group.question} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {report.near_examples.length > 0 && (
            <Panel
              title="On the way to becoming examples"
              description={`Questions whose answer got a thumbs up from fewer than ${report.example_min_members} signed-in members so far, and no thumbs down.`}
            >
              <ul className="space-y-1 text-sm">
                {report.near_examples.map((near) => (
                  <li key={near.question} className="flex justify-between gap-4">
                    <span>{near.question}</span>
                    <span className="text-ink-soft tabular-nums">{near.members} of {report.example_min_members}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}
    </Container>
  );
}
