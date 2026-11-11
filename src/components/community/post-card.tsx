import Link from "next/link";
import type { Route } from "next";
import { MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui";
import { VoteButtons } from "@/components/community/vote-buttons";
import { FLAIR_LABELS, timeAgo, type ForumPost } from "@/lib/forum";

/** One post in a forum list: votes, flair, title, author, age, comments (Scenario 1). */
export function PostCard({ post, viewerId }: { post: ForumPost; viewerId: string | null }) {
  return (
    <li className="card flex gap-4 p-4">
      <VoteButtons kind="POST" id={post.id} score={post.score} myVote={post.my_vote} isOwn={post.author_id === viewerId} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={post.flair === "QUESTION" ? "info" : post.flair === "TIP" ? "success" : "accent"}>{FLAIR_LABELS[post.flair]}</Badge>
          <span className="text-xs text-ink-soft">{post.author_name} · {timeAgo(post.created_at)}</span>
        </div>
        <Link href={`/community/posts/${post.id}` as Route} className="heading mt-2 block text-lg hover:underline">
          {post.title}
        </Link>
        {post.body && <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{post.body}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-ink-soft">
          <span className="inline-flex items-center gap-1"><MessageSquare className="size-3.5" aria-hidden="true" />{post.comment_count} comment{post.comment_count === 1 ? "" : "s"}</span>
          {post.photo_urls.length > 0 && <span>{post.photo_urls.length} photo{post.photo_urls.length === 1 ? "" : "s"}</span>}
          {post.gear && <span>Links: {post.gear.name}</span>}
        </div>
      </div>
      {post.photo_urls[0] && (
        // eslint-disable-next-line @next/next/no-img-element -- a short-lived presigned URL
        <img src={post.photo_urls[0]} alt="" className="hidden size-20 shrink-0 rounded-lg object-cover sm:block" />
      )}
    </li>
  );
}
