"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Camera, LoaderCircle } from "lucide-react";
import { searchByPhoto } from "@/app/browse/actions";
import { browseHref, type BrowseFilters } from "@/lib/browse-params";

/** Long side sent to the API: the model reads 672 px as well as a full-size photo, and much faster. */
const MAX_SIDE_PX = 672;

/**
 * Redraws the photo at most MAX_SIDE_PX on its long side as a JPEG. Also drops
 * EXIF, so the photo's location never leaves the device.
 */
async function shrink(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE_PX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
}

/**
 * S6-03 Scenario 1: search with a photo. On a phone, `capture` opens the
 * camera; elsewhere it is a file picker. The answer becomes an ordinary
 * browse URL, so the filters already applied stay applied (Scenario 3).
 */
export function PhotoSearchButton({ filters }: { filters: BrowseFilters }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      let image: string;
      try {
        image = await shrink(file);
      } catch {
        setError("That file couldn't be opened as a photo. Try a JPEG or PNG.");
        return;
      }
      const response = await searchByPhoto(image);
      if ("error" in response) return setError(response.error);
      const { result } = response;
      if (!result.confident || !result.item_type) {
        return setError("We couldn't tell what that is. Try a clearer photo of just the item, or search by name.");
      }
      router.push(
        browseHref({
          ...filters,
          q: result.query,
          photo: result.item_type,
          photo_category: result.category,
          sort: "relevance",
          page: 1,
        }) as Route,
      );
    });
    if (input.current) input.current.value = "";
  }

  return (
    <div className="contents">
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="sr-only"
        id="photo-search"
        aria-label="Search by photo"
        onChange={(event) => onFile(event.target.files?.[0])}
        disabled={isPending}
      />
      <label
        htmlFor="photo-search"
        title="Search by photo"
        className={`absolute right-[6.75rem] top-1/2 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink ${isPending ? "pointer-events-none" : ""}`}
      >
        {isPending ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : <Camera className="size-5" aria-hidden="true" />}
        <span className="sr-only">{isPending ? "Looking at your photo…" : "Search by photo"}</span>
      </label>
      {(isPending || error) && (
        <p role="status" className="absolute inset-x-0 top-full z-10 mt-2 rounded-2xl border border-line bg-white px-5 py-3 text-sm text-ink-soft shadow-sm">
          {isPending ? "Looking at your photo… this takes about 10 seconds." : (
            <>
              {error}{" "}
              <Link href="/requests/new" className="underline">Post a gear request</Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
