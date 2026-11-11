"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useDismiss } from "@/components/use-dismiss";
import { PersonAvatar } from "@/components/person-avatar";
import { PhotoCropModal } from "@/components/photo-crop-modal";
import { removeProfilePhoto, saveProfilePhoto, type ProfilePhotoResult } from "@/app/profile/actions";
import { ALLOWED_PHOTO_CONTENT_TYPES } from "@/lib/listings";
import { CENTERED_CROP, cropBitmapToFile, type CropTransform } from "@/lib/image-crop";
import { putFileToS3 } from "@/lib/photo-upload";
import {
  PROFILE_PHOTO_MIN_SIDE,
  PROFILE_PHOTO_SIDE,
  profilePhotoBytesError,
  profilePhotoSizeError,
  profilePhotoTypeError,
} from "@/lib/profile-photo";

type CropSource = { file: File; crop: CropTransform };

type ProfilePhotoEditor = {
  avatarUrl: string | null;
  busy: "saving" | "removing" | null;
  /** Whether "Adjust" has a full original to re-crop from. */
  canAdjust: boolean;
  pick: () => void;
  adjust: () => void;
  remove: () => void;
  /** The hidden file input and the crop editor; render once, anywhere. */
  elements: ReactNode;
};

/**
 * Picks, crops and saves the member's profile photo - the logic shared by
 * onboarding's ProfilePhotoField and the profile page's ProfileAvatarEditor,
 * which differ only in how they present it.
 *
 * Saved the moment the crop is confirmed rather than with a surrounding
 * form, so it is never lost to a form's validation error. The upload goes to
 * a private prefix; the backend makes it public only once it has checked and
 * re-encoded it, and an upload that is never saved (a cancelled crop, a
 * closed tab) is swept up after a day.
 *
 * Keeps the saved photo's original file, like PhotoUploadField, so "Adjust"
 * re-crops from the full photo rather than from the already-cropped square.
 * The file being cropped is held apart from it until saved, so cancelling a
 * new pick leaves "Adjust" on the photo actually shown.
 */
function useProfilePhotoEditor(initialUrl: string | null, onError: (message: string | null) => void): ProfilePhotoEditor {
  const [avatarUrl, setAvatarUrl] = useState(initialUrl);
  // The source of the photo shown, when it was picked in this visit.
  const [original, setOriginal] = useState<CropSource | null>(null);
  // The source open in the crop editor, if any.
  const [pending, setPending] = useState<CropSource | null>(null);
  const [busy, setBusy] = useState<"saving" | "removing" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { show } = useToast();

  async function handlePicked(file: File | undefined) {
    // Cleared so picking the same file again (after cancelling) re-fires onChange.
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    onError(null);

    const typeError = profilePhotoTypeError(file);
    if (typeError) return onError(typeError);

    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      const sizeError = profilePhotoSizeError(bitmap.width, bitmap.height);
      bitmap.close();
      if (sizeError) return onError(sizeError);
    } catch {
      return onError("We could not open that photo. Please choose another.");
    }

    setPending({ file, crop: CENTERED_CROP });
  }

  async function handleCropped(crop: CropTransform) {
    if (!pending) return;
    const { file } = pending;
    setPending(null);
    setBusy("saving");
    onError(null);

    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      const cropped = await cropBitmapToFile(bitmap, crop, file.type, file.name, PROFILE_PHOTO_SIDE);
      bitmap.close();
      if (!cropped) throw new Error("We could not prepare that photo. Please try again.");

      const bytesError = profilePhotoBytesError(cropped.size);
      if (bytesError) throw new Error(bytesError);

      const uploadKey = await putFileToS3(cropped, "/api/profile/avatar/presign");
      if (applyResult(await saveProfilePhoto(uploadKey), "Profile photo updated.")) setOriginal({ file, crop });
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Your photo could not be saved. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function handleRemove() {
    setBusy("removing");
    onError(null);
    try {
      if (applyResult(await removeProfilePhoto(), "Profile photo removed.")) setOriginal(null);
    } catch {
      onError("Your photo could not be removed. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  /** Shows the outcome; true when it worked. */
  function applyResult(result: ProfilePhotoResult, success: string): boolean {
    if (result.error) {
      onError(result.error);
      return false;
    }
    setAvatarUrl(result.avatarUrl ?? null);
    show(success, "success");
    return true;
  }

  return {
    avatarUrl,
    busy,
    canAdjust: original !== null && avatarUrl !== null,
    pick: () => inputRef.current?.click(),
    adjust: () => setPending(original),
    remove: () => void handleRemove(),
    elements: (
      <>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_PHOTO_CONTENT_TYPES.join(",")}
          onChange={(event) => void handlePicked(event.target.files?.[0])}
          className="hidden"
          aria-label="Choose a profile photo"
        />
        {pending && (
          <PhotoCropModal
            file={pending.file}
            initialCrop={pending.crop}
            shape="circle"
            title="Position your photo"
            saveLabel="Use photo"
            onCancel={() => setPending(null)}
            onSave={(crop) => void handleCropped(crop)}
          />
        )}
      </>
    ),
  };
}

/**
 * Onboarding's photo step: the avatar with labelled buttons beside it and
 * errors written underneath.
 *
 * Every button is type="button": this sits beside the onboarding form, which
 * a stray submit would send half-filled.
 */
export function ProfilePhotoField({ name, initialUrl }: { name: string | null; initialUrl: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const editor = useProfilePhotoEditor(initialUrl, setError);
  const disabled = editor.busy !== null;

  return (
    <div className="flex items-center gap-5">
      <PersonAvatar name={name} imageUrl={editor.avatarUrl} size="xl" />

      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={disabled} onClick={editor.pick}>
            {editor.busy === "saving" ? "Saving…" : editor.avatarUrl ? "Change photo" : "Add photo"}
          </Button>
          {editor.canAdjust && (
            <Button type="button" variant="outline" disabled={disabled} onClick={editor.adjust}>
              Adjust
            </Button>
          )}
          {editor.avatarUrl && (
            <Button type="button" variant="outline" disabled={disabled} onClick={editor.remove}>
              {editor.busy === "removing" ? "Removing…" : "Remove"}
            </Button>
          )}
        </div>
        <p className="mt-2 text-xs text-ink-soft">Optional. JPEG, PNG or WebP, at least {PROFILE_PHOTO_MIN_SIDE} pixels across.</p>
        {error && (
          <p role="alert" className="mt-2 text-xs text-accent-dark">
            {error}
          </p>
        )}
      </div>

      {editor.elements}
    </div>
  );
}

const MENU_ITEM =
  "flex w-full items-center rounded-lg px-3.5 py-2 text-left text-sm text-ink transition-colors hover:bg-surface-muted";

/**
 * The profile page's own avatar, editable in place: a pencil at its bottom
 * right opens the file picker straight away when there is no photo yet, or a
 * small menu (change, adjust, remove) when there is.
 *
 * Errors go to a toast - a page heading has nowhere to put a line of red text.
 */
export function ProfileAvatarEditor({ name, initialUrl }: { name: string | null; initialUrl: string | null }) {
  const { show } = useToast();
  const showError = useCallback((message: string | null) => {
    if (message) show(message, "error");
  }, [show]);
  const editor = useProfilePhotoEditor(initialUrl, showError);
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useDismiss(rootRef, menuOpen, closeMenu);

  const hasPhoto = editor.avatarUrl !== null;
  const choose = (action: () => void) => () => {
    closeMenu();
    action();
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <div className={editor.busy ? "opacity-60 transition-opacity" : "transition-opacity"}>
        <PersonAvatar name={name} imageUrl={editor.avatarUrl} size="lg" />
      </div>
      <button
        type="button"
        disabled={editor.busy !== null}
        onClick={hasPhoto ? () => setMenuOpen((open) => !open) : editor.pick}
        aria-label={hasPhoto ? "Edit profile photo" : "Add profile photo"}
        aria-haspopup={hasPhoto ? "menu" : undefined}
        aria-expanded={hasPhoto ? menuOpen : undefined}
        title={hasPhoto ? "Edit profile photo" : "Add profile photo"}
        className="absolute -bottom-0.5 -right-0.5 flex size-6 items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm outline-none transition-colors hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-wait"
      >
        <Pencil className="size-3" aria-hidden="true" />
      </button>

      {menuOpen && (
        <div role="menu" className="absolute left-0 top-full z-40 mt-2 w-44 rounded-xl border border-line bg-white p-1.5 shadow-lg">
          <button type="button" role="menuitem" className={MENU_ITEM} onClick={choose(editor.pick)}>
            Change photo
          </button>
          {editor.canAdjust && (
            <button type="button" role="menuitem" className={MENU_ITEM} onClick={choose(editor.adjust)}>
              Adjust
            </button>
          )}
          <button type="button" role="menuitem" className={MENU_ITEM} onClick={choose(editor.remove)}>
            Remove photo
          </button>
        </div>
      )}

      {editor.elements}
    </div>
  );
}
