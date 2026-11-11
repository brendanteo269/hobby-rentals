"use client";

import { useState } from "react";
import { PersonAvatar } from "@/components/person-avatar";
import { CommentForm } from "@/components/community/comment-form";
import { ReportButton } from "@/components/community/report-button";
import { VoteButtons } from "@/components/community/vote-buttons";
import { timeAgo, type ForumComment } from "@/lib/forum";

/** S6-11 Scenario 4: comments threaded under their parent, replies allowed down to the third level. */
export function CommentThread({ postId, comments, viewerId }: { postId: string; comments: ForumComment[]; viewerId: string | null }) {
  return (
    <ul className="space-y-4">
      {comments.map((comment) => (
        <CommentItem key={comment.id} postId={postId} comment={comment} viewerId={viewerId} />
      ))}
    </ul>
  );
}

function CommentItem({ postId, comment, viewerId }: { postId: string; comment: ForumComment; viewerId: string | null }) {
  const [replying, setReplying] = useState(false);
  const isOwn = comment.author_id === viewerId;
  return (
    <li id={`comment-${comment.id}`} className="scroll-mt-24">
      <div className="flex gap-3">
        {comment.removed ? (
          <div className="size-6 shrink-0 rounded-full bg-surface-muted" aria-hidden="true" />
        ) : (
          <PersonAvatar name={comment.author_name} imageUrl={comment.author_avatar_url} size="sm" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs text-ink-soft">
            {comment.removed ? "Removed" : <span className="font-medium text-ink">{comment.author_name}</span>}
            {" · "}
            {timeAgo(comment.created_at)}
          </p>
          {comment.removed ? (
            <p className="mt-1 text-sm italic text-ink-soft">This comment was removed by a moderator.</p>
          ) : (
            <>
              <p className="mt-1 whitespace-pre-line break-words text-sm text-ink">{comment.body}</p>
              <div className="mt-2 flex items-center gap-4">
                <VoteButtons kind="COMMENT" id={comment.id} score={comment.score} myVote={comment.my_vote} isOwn={isOwn} compact />
                {comment.depth < 2 && (
                  <button type="button" className="text-xs font-medium text-ink-soft hover:text-ink" onClick={() => setReplying(true)}>
                    Reply
                  </button>
                )}
                {!isOwn && <ReportButton kind="COMMENT" id={comment.id} />}
              </div>
            </>
          )}
          {replying && (
            <div className="mt-3">
              <CommentForm postId={postId} parentId={comment.id} autoFocus onDone={() => setReplying(false)} placeholder={`Reply to ${comment.author_name}`} />
            </div>
          )}
          {comment.replies.length > 0 && (
            <div className="mt-4 border-l-2 border-line pl-4">
              <CommentThread postId={postId} comments={comment.replies} viewerId={viewerId} />
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
