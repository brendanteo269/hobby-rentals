import { requirePortalSession } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCaseAge, getModerationQueue, PRIORITY } from "@/lib/moderation";
import { Badge, Container, Panel } from "@/components/ui";
import { ForumReportForm } from "@/components/forum-report-form";

export const metadata = { title: "Community moderation — HobbyRentals Admin" };

const REASONS: Record<string, string> = {
  SPAM: "Spam", HARASSMENT: "Harassment", SCAM_OR_FRAUD: "Scam or fraud",
  INAPPROPRIATE_CONTENT: "Inappropriate", OFF_TOPIC: "Off topic", OTHER: "Other",
};

type Evidence = { post_title?: string; post_body?: string; comment_body?: string; author_name?: string };

const WEB_APP_URL = (process.env.WEB_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/**
 * S6-11 Scenario 6: reported forum posts and comments, from the shared
 * moderation queue, most urgent first. Each shows what was said when it was
 * reported (frozen in the report), and is decided here.
 */
export default async function CommunityModerationPage() {
  await requirePortalSession();
  const queue = await getModerationQueue({ statuses: ["OPEN"], kinds: ["FORUM_POST", "FORUM_COMMENT"], priorities: [], search: "" }, 1);
  const ids = queue.reports.map((r) => r.id);
  const { data: rows } = ids.length
    ? await createAdminClient().from("reports").select("id, evidence, explanation").in("id", ids)
    : { data: [] };
  const details = new Map((rows ?? []).map((row) => [row.id as string, row as { evidence: Evidence; explanation: string | null }]));

  return (
    <Container className="py-12">
      <p className="eyebrow">Admin</p>
      <h1 className="display-caps mt-3 text-3xl">Community</h1>
      <div className="mt-8">
        <Panel
          title="Reported posts and comments"
          description={queue.error ?? (queue.reports.length === 0
            ? "Nothing waiting. Posts and comments members report show up here."
            : `${queue.total} open report${queue.total === 1 ? "" : "s"}, most urgent first.`)}
        >
          {queue.reports.length > 0 && (
            <ul className="-mx-6 -my-5 divide-y divide-line">
              {queue.reports.map((r) => {
                const detail = details.get(r.id);
                const evidence = detail?.evidence ?? {};
                const isComment = r.kind === "FORUM_COMMENT";
                return (
                  <li key={r.id} className="px-6 py-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span>
                        <span className="font-medium">{isComment ? "Comment" : "Post"} by {evidence.author_name ?? r.reported_name ?? "a member"}</span>
                        <span className="mt-0.5 block text-xs text-ink-soft">
                          On &ldquo;{r.forum_post_title ?? evidence.post_title}&rdquo; · reported by {r.reporter_name ?? "a member"} · open {formatCaseAge(r.case_age_seconds)}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <Badge tone={PRIORITY[r.priority].tone}>{PRIORITY[r.priority].label}</Badge>
                        <Badge tone="warning">{REASONS[r.reason_code] ?? r.reason_code}</Badge>
                      </span>
                    </div>
                    <blockquote className="mt-3 whitespace-pre-line border-l-2 border-line pl-3 text-sm">
                      {isComment ? evidence.comment_body : `${evidence.post_title ?? ""}\n\n${evidence.post_body ?? ""}`.trim()}
                    </blockquote>
                    {detail?.explanation && <p className="mt-2 text-xs text-ink-soft">Reporter said: {detail.explanation}</p>}
                    {r.forum_post_id && (
                      <a href={`${WEB_APP_URL}/community/posts/${r.forum_post_id}${r.forum_comment_id ? `#comment-${r.forum_comment_id}` : ""}`}
                        target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs underline">
                        Open in Community
                      </a>
                    )}
                    <ForumReportForm reportId={r.id} what={isComment ? "comment" : "post"} />
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </Container>
  );
}
