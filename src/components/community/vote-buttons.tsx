"use client";

import { useState, useTransition } from "react";
import { ArrowBigDown, ArrowBigUp } from "lucide-react";
import { vote } from "@/app/community/actions";
import type { ForumTargetKind } from "@/lib/forum";

/**
 * S6-11 Scenario 5: up and down votes. Pressing the vote you already gave
 * takes it back. The score moves at once and is corrected from the server's
 * answer; your own post or comment can't be voted on.
 */
export function VoteButtons({
  kind, id, score, myVote, isOwn, compact = false,
}: { kind: ForumTargetKind; id: string; score: number; myVote: number; isOwn: boolean; compact?: boolean }) {
  const [state, setState] = useState({ score, myVote });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function cast(direction: -1 | 1) {
    const value = state.myVote === direction ? 0 : direction;
    const before = state;
    setError(null);
    setState({ score: state.score - state.myVote + value, myVote: value });
    startTransition(async () => {
      const result = await vote(kind, id, value);
      if ("error" in result) {
        setState(before);
        setError(result.error);
      } else {
        setState({ score: result.score, myVote: result.my_vote });
      }
    });
  }

  const label = isOwn ? "You can't vote on your own" : undefined;
  const button = "rounded-md p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className={`flex ${compact ? "flex-row" : "flex-col"} items-center gap-0.5`} title={error ?? label}>
      <button
        type="button"
        aria-label="Upvote"
        aria-pressed={state.myVote === 1}
        disabled={isOwn || isPending}
        onClick={() => cast(1)}
        className={`${button} ${state.myVote === 1 ? "text-accent" : "text-ink-soft hover:text-accent"}`}
      >
        <ArrowBigUp className="size-5" fill={state.myVote === 1 ? "currentColor" : "none"} aria-hidden="true" />
      </button>
      <span className="min-w-6 text-center text-sm font-semibold tabular-nums text-ink" aria-label={`Score ${state.score}`}>
        {state.score}
      </span>
      <button
        type="button"
        aria-label="Downvote"
        aria-pressed={state.myVote === -1}
        disabled={isOwn || isPending}
        onClick={() => cast(-1)}
        className={`${button} ${state.myVote === -1 ? "text-info" : "text-ink-soft hover:text-info"}`}
      >
        <ArrowBigDown className="size-5" fill={state.myVote === -1 ? "currentColor" : "none"} aria-hidden="true" />
      </button>
      {error && <span role="alert" className="sr-only">{error}</span>}
    </div>
  );
}
