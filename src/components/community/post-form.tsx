"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ImagePlus, Search, X } from "lucide-react";
import { Button, Field, FormNotice, SelectField, TextareaField } from "@/components/ui";
import { MessageWarningModal } from "@/components/messages/message-warning-modal";
import { GearCardLink } from "@/components/community/gear-card";
import { findGear, submitPost } from "@/app/community/actions";
import { putFileToS3 } from "@/lib/photo-upload";
import { FLAIRS, FLAIR_LABELS, type Flair, type GearCard, type Held } from "@/lib/forum";

const MAX_PHOTOS = 4;

/** S6-11 Scenarios 2, 3 and 7: a new post with flair, up to 4 photos and one optional piece of gear. */
export function PostForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [flair, setFlair] = useState<Flair>("QUESTION");
  const [photos, setPhotos] = useState<{ key: string; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [gear, setGear] = useState<GearCard | null>(null);
  const [gearQuery, setGearQuery] = useState("");
  const [gearResults, setGearResults] = useState<GearCard[] | null>(null);
  const [held, setHeld] = useState<Held | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSearching, startSearch] = useTransition();

  async function addPhotos(files: FileList | null) {
    if (!files) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of [...files].slice(0, MAX_PHOTOS - photos.length)) {
        const key = await putFileToS3(file, "/api/forum/photos/presign");
        setPhotos((current) => [...current, { key, preview: URL.createObjectURL(file) }]);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "A photo failed to upload.");
    } finally {
      setUploading(false);
    }
  }

  function searchGear() {
    startSearch(async () => setGearResults(await findGear(gearQuery)));
  }

  function send(confirmationId: string | null) {
    setError(null);
    startTransition(async () => {
      const result = await submitPost(slug, {
        title, body, flair, photo_keys: photos.map((p) => p.key),
        listing_id: gear?.kind === "LISTING" ? gear.id : null,
        bundle_id: gear?.kind === "BUNDLE" ? gear.id : null,
        confirmation_id: confirmationId,
      });
      if ("error" in result) {
        setHeld(null);
        return setError(result.error);
      }
      if (result.status === "needs_confirmation") return setHeld(result);
      router.push(`/community/posts/${result.id}` as Route);
    });
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        send(null);
      }}
    >
      <Field label="Title" id="title" required minLength={3} maxLength={300} value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder="Which tent survives a Singapore downpour?" />
      <SelectField label="Flair" id="flair" value={flair} onChange={(e) => setFlair(e.target.value as Flair)}>
        {FLAIRS.map((value) => <option key={value} value={value}>{FLAIR_LABELS[value]}</option>)}
      </SelectField>
      <TextareaField label="Post" id="body" rows={8} maxLength={10000} value={body} onChange={(e) => setBody(e.target.value)}
        hint="Share the details: where, when, what worked and what didn't." />

      <div>
        <p className="text-sm font-medium text-ink">Photos <span className="font-normal text-ink-soft">(up to {MAX_PHOTOS})</span></p>
        <div className="mt-2 flex flex-wrap gap-3">
          {photos.map((photo) => (
            <div key={photo.key} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview of the member's own upload */}
              <img src={photo.preview} alt="" className="size-24 rounded-lg object-cover" />
              <button type="button" aria-label="Remove photo" onClick={() => setPhotos((all) => all.filter((p) => p.key !== photo.key))}
                className="absolute -right-2 -top-2 rounded-full bg-ink p-1 text-white">
                <X className="size-3" aria-hidden="true" />
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <label className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line text-xs text-ink-soft hover:border-ink-soft">
              <ImagePlus className="size-5" aria-hidden="true" />
              {uploading ? "Uploading…" : "Add photo"}
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={uploading}
                onChange={(event) => { void addPhotos(event.target.files); event.target.value = ""; }} />
            </label>
          )}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-ink">Link gear <span className="font-normal text-ink-soft">(optional)</span></p>
        {gear ? (
          <div className="mt-2 flex items-center gap-3">
            <GearCardLink gear={gear} />
            <button type="button" className="text-xs text-ink-soft underline" onClick={() => setGear(null)}>Remove</button>
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            <div className="flex gap-2">
              <input
                aria-label="Search listings and bundles"
                value={gearQuery}
                onChange={(e) => setGearQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); searchGear(); } }}
                placeholder="Search listings and bundles by name"
                className="h-10 flex-1 rounded-full border border-line bg-white px-4 text-sm outline-none focus:border-ink"
              />
              <Button type="button" variant="outline" className="px-4 py-2 text-xs" onClick={searchGear} disabled={isSearching || gearQuery.trim().length < 2}>
                <Search className="size-4" aria-hidden="true" /> {isSearching ? "Finding…" : "Find"}
              </Button>
            </div>
            {gearResults && (gearResults.length === 0 ? (
              <p className="text-xs text-ink-soft">No live listings or bundles match that name.</p>
            ) : (
              <ul className="space-y-1">
                {gearResults.map((card) => (
                  <li key={card.id}>
                    <button type="button" onClick={() => { setGear(card); setGearResults(null); }}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-muted">
                      {card.name} <span className="text-xs text-ink-soft">· {card.kind === "BUNDLE" ? "Bundle" : "Listing"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        )}
      </div>

      <FormNotice message={error ?? undefined} />
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending || uploading || title.trim().length < 3}>{isPending ? "Posting…" : "Post"}</Button>
      </div>
      {held && <MessageWarningModal warnings={held.warnings} isSending={isPending} onEdit={() => setHeld(null)} onSend={() => send(held.confirmation_id)} />}
    </form>
  );
}
