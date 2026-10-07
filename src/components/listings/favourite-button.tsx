"use client";

import { Heart } from "lucide-react";
import { useState } from "react";
import { setFavourite } from "@/app/listings/[id]/favourite-actions";
import { useToast } from "@/components/toast";

export function FavouriteButton({ listingId, initiallySaved, initialCount, onRemoved, hideCount = false }: {
  listingId: string;
  initiallySaved: boolean;
  initialCount: number;
  onRemoved?: () => void;
  hideCount?: boolean;
}) {
  const [saved, setSaved] = useState(initiallySaved);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);
  const toast = useToast();

  async function toggle() {
    if (pending) return;
    const wasSaved = saved;
    const previousCount = count;
    const nextSaved = !wasSaved;
    setSaved(nextSaved);
    setCount(Math.max(0, previousCount + (nextSaved ? 1 : -1)));
    setPending(true);

    const result = await setFavourite(listingId, nextSaved);
    setPending(false);
    if (!result.ok) {
      setSaved(wasSaved);
      setCount(previousCount);
      toast.show(result.error, "error");
      return;
    }
    setSaved(result.favourite.saved);
    setCount(result.favourite.favourite_count);
    if (!result.favourite.saved) onRemoved?.();
  }

  return (
    <div className="flex items-center gap-1 text-sm text-ink-soft">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={saved}
        aria-label={saved ? "Remove from favourites" : "Save to favourites"}
        className={`flex size-11 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-wait disabled:opacity-60 ${
          saved ? "bg-accent-soft text-red-600" : "text-ink-soft hover:bg-surface-muted hover:text-ink"
        }`}
      >
        <Heart className="size-5" fill={saved ? "currentColor" : "none"} aria-hidden="true" />
      </button>
      {!hideCount && <span aria-live="polite">{count}</span>}
    </div>
  );
}
