import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Badge, Container } from "@/components/ui";
import { PersonAvatar } from "@/components/person-avatar";
import { CommentForm } from "@/components/community/comment-form";
import { CommentThread } from "@/components/community/comment-thread";
import { GearCardLink } from "@/components/community/gear-card";
import { ReportButton } from "@/components/community/report-button";
import { VoteButtons } from "@/components/community/vote-buttons";
import { ForumApiError, getForumPost } from "@/lib/api/forum";
import { COMMENT_SORTS, FLAIR_LABELS, sortComments, timeAgo, type CommentSort } from "@/lib/forum";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Community — HobbyRentals" };

/** S6-11: one post with its photos, linked gear, votes and threaded comments. */
export default async function PostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ comments?: string }>;
}) {
  const { id } = await params;
  const commentSort: CommentSort = (await searchParams).comments === "new" ? "new" : "top";
  let data;
  try {
    data = await getForumPost(id);
  } catch (error) {
    if (error instanceof ForumApiError && error.status === 404) notFound();
    throw error;
  }
  const { data: { user } } = await (await createClient()).auth.getUser();
  const { post } = data;
  const isOwn = post.author_id === user?.id;

  return (
    <Container className="max-w-3xl pb-16 pt-10">
      <Link href={`/community/${post.category_slug}` as Route} className="text-sm text-ink-soft hover:text-ink">&larr; {data.category_label}</Link>
      <article className="mt-4 flex gap-4">
        <VoteButtons kind="POST" id={post.id} score={post.score} myVote={post.my_vote} isOwn={isOwn} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="accent">{FLAIR_LABELS[post.flair]}</Badge>
            <PersonAvatar name={post.author_name} imageUrl={post.author_avatar_url} size="sm" />
            <span className="text-xs text-ink-soft">{post.author_name} · {timeAgo(post.created_at)}</span>
          </div>
          <h1 className="heading mt-3 text-2xl">{post.title}</h1>
          {post.body && <p className="body-copy mt-3 whitespace-pre-line break-words">{post.body}</p>}
          {post.photo_urls.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {post.photo_urls.map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a short-lived presigned URL */}
                  <img src={url} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
                </a>
              ))}
            </div>
          )}
          {post.gear && <div className="mt-4"><GearCardLink gear={post.gear} /></div>}
          <div className="mt-4 flex items-center gap-4 text-xs text-ink-soft">
            <span>{post.comment_count} comment{post.comment_count === 1 ? "" : "s"}</span>
            {!isOwn && <ReportButton kind="POST" id={post.id} />}
          </div>
        </div>
      </article>

      <section className="mt-10 border-t border-line pt-6" aria-label="Comments">
        <CommentForm postId={post.id} />
        <div className="mt-8">
          {data.comments.length === 0 ? (
            <p className="text-sm text-ink-soft">No comments yet.</p>
          ) : (
            <>
              <nav aria-label="Sort comments" className="mb-6 flex gap-2">
                {COMMENT_SORTS.map((option) => {
                  const active = commentSort === option.value;
                  return (
                    <Link
                      key={option.value}
                      href={`/community/posts/${post.id}${option.value === "top" ? "" : "?comments=new"}` as Route}
                      scroll={false}
                      aria-current={active ? "page" : undefined}
                      className={`rounded-full px-3 py-1.5 text-sm transition-colors ${active ? "bg-ink text-white" : "bg-surface-muted text-ink-soft hover:text-ink"}`}
                    >
                      {option.label}
                    </Link>
                  );
                })}
              </nav>
              <CommentThread postId={post.id} comments={sortComments(data.comments, commentSort)} viewerId={user?.id ?? null} />
            </>
          )}
        </div>
      </section>
    </Container>
  );
}
