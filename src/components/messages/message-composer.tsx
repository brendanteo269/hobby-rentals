"use client";

import { useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { Paperclip } from "lucide-react";
import { Button, inputBase } from "@/components/ui";
import { useToast } from "@/components/toast";
import { replyToConversation, startBookingConversation, startListingConversation } from "@/app/messages/actions";
import { MAX_MESSAGE_ATTACHMENTS, type ConversationLimits, type Message } from "@/lib/conversations";
import { AttachmentCropModal } from "./attachment-crop-modal";

type Target =
  | { kind: "reply"; conversationId: string }
  | { kind: "listing"; listingId: string }
  | { kind: "booking"; bookingId: string };

type Attachment = { key: string; previewUrl: string; fileName: string };
type UploadingSlot = { id: string; fileName: string };

/** Only blob: URLs are ours to free; nothing else is held here. */
function releasePreview(url: string) {
  URL.revokeObjectURL(url);
}

/**
 * Presigns and PUTs one attachment to S3, returning the resulting
 * attachment_key - the same presign-then-PUT protocol putPhotoToS3 uses for
 * listing photos (src/components/listings/photo-upload-field.tsx), just
 * against the message-attachments endpoint.
 */
async function putAttachmentToS3(file: File): Promise<string> {
  const presignRes = await fetch("/api/messages/attachments/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content_type: file.type }),
  });
  if (!presignRes.ok) {
    const body: unknown = await presignRes.json().catch(() => null);
    const message =
      body !== null && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : "Could not prepare the upload.";
    throw new Error(message);
  }
  const { upload_url, attachment_key } = (await presignRes.json()) as { upload_url: string; attachment_key: string };

  const putRes = await fetch(upload_url, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!putRes.ok) throw new Error(`${file.name} failed to upload. Try again.`);

  return attachment_key;
}

/**
 * A chat-bar composer - one text box and a send button beside it, like every
 * chat app - not a labelled form field. `label` still names the box for
 * screen readers via aria-label; it just isn't shown, since "Reply" printed
 * above a reply box a thread already makes obvious is noise, not context.
 *
 * `target` carries which action to call as plain data rather than a bound
 * function prop: a Server Component parent can hand a Client Component a
 * genuine Server Action reference or plain serializable data, but not an
 * arbitrary closure wrapping one (React rejects it as an "event handler"
 * crossing the boundary) - so the binding happens here, on the client, using
 * the id the caller already has.
 *
 * `attachmentLimits` is omitted only by old call sites during a migration;
 * every current one passes it (S2-17's GET /conversations/limits), since
 * without it there would be nothing to validate a picked file against
 * before uploading it.
 */
export function MessageComposer({
  target,
  label = "Message",
  placeholder = "Write a message…",
  submitLabel = "Send",
  attachmentLimits,
  extraButton,
  onSent,
}: {
  target: Target;
  label?: string;
  placeholder?: string;
  submitLabel?: string;
  attachmentLimits?: ConversationLimits;
  /** An extra control shown alongside the attachment button - e.g. the booking thread's "Arrange meetup" trigger. */
  extraButton?: ReactNode;
  /**
   * Called with the sent message right after a `kind: "reply"` send
   * succeeds, so the thread can show it immediately instead of waiting on a
   * server round-trip to refetch the whole page. Only reply has one to call
   * back with - starting a conversation navigates to the new thread instead,
   * which loads its own messages.
   */
  onSent?: (message: Message) => void;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState<UploadingSlot[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  // The file waiting on the crop/review step, if any - set the moment a
  // valid file is picked, cleared on cancel or once its (possibly cropped)
  // result starts uploading. Nothing is uploaded until that step confirms
  // it: picking a file is not the same as deciding to send it.
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remainingSlots = MAX_MESSAGE_ATTACHMENTS - attachments.length - uploading.length;

  function handleFileSelected(files: FileList | null) {
    const file = files?.[0];
    // Cleared so picking the same file again (after removing it) re-fires onChange.
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file || !attachmentLimits) return;
    setAttachmentError(null);

    if (!attachmentLimits.allowed_attachment_content_types.includes(file.type)) {
      setAttachmentError(`${file.name}: unsupported file type.`);
      return;
    }
    if (file.size > attachmentLimits.max_attachment_bytes) {
      setAttachmentError(`${file.name}: file is too large (max ${Math.floor(attachmentLimits.max_attachment_bytes / (1024 * 1024))}MB).`);
      return;
    }
    setPendingFile(file);
  }

  async function uploadOne(file: File) {
    const slot: UploadingSlot = { id: crypto.randomUUID(), fileName: file.name };
    setUploading((current) => [...current, slot]);

    try {
      const key = await putAttachmentToS3(file);
      setAttachments((current) => [...current, { key, previewUrl: URL.createObjectURL(file), fileName: file.name }]);
    } catch (caught) {
      setAttachmentError(caught instanceof Error ? caught.message : `${file.name} failed to upload.`);
    } finally {
      setUploading((current) => current.filter((item) => item.id !== slot.id));
    }
  }

  function removeAttachment(key: string) {
    setAttachments((current) => {
      const target = current.find((attachment) => attachment.key === key);
      if (target) releasePreview(target.previewUrl);
      return current.filter((attachment) => attachment.key !== key);
    });
  }

  function submit() {
    const value = text.trim();
    const attachmentKeys = attachments.map((attachment) => attachment.key);
    if (!value && attachmentKeys.length === 0) return;

    setIsSending(true);
    void (async () => {
      try {
        if (target.kind === "reply") {
          const result = await replyToConversation(target.conversationId, value, attachmentKeys);
          // Forced to commit and paint on its own, ahead of appending the
          // message below: the button must stop showing "Sending…" before
          // the new bubble appears, not in the same update as it - plain
          // setState here left the two visibly out of order, since onSent
          // updates a different component (ConversationThreadPanel) than
          // this one's own pending flag.
          flushSync(() => setIsSending(false));
          if ("error" in result) {
            show(result.error, "error");
            return;
          }
          setText("");
          attachments.forEach((attachment) => releasePreview(attachment.previewUrl));
          setAttachments([]);
          onSent?.(result.message);
          return;
        }

        const result =
          target.kind === "listing"
            ? await startListingConversation(target.listingId, value, attachmentKeys)
            : await startBookingConversation(target.bookingId, value, attachmentKeys);
        setIsSending(false);
        if ("error" in result) {
          show(result.error, "error");
          return;
        }
        router.push(`/messages/${result.conversation.id}`);
      } catch (error) {
        setIsSending(false);
        throw error;
      }
    })();
  }

  const canSend = !isSending && uploading.length === 0 && (text.trim().length > 0 || attachments.length > 0);

  return (
    <div className="flex flex-col gap-2">
      {(attachments.length > 0 || uploading.length > 0) && (
        <ul className="flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <li key={attachment.key} className="group relative h-32 w-32 overflow-hidden rounded-lg border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element -- a local blob: URL, not an optimizable remote image */}
              <img src={attachment.previewUrl} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeAttachment(attachment.key)}
                aria-label={`Remove ${attachment.fileName}`}
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-ink/80 text-sm text-white opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
              >
                ×
              </button>
            </li>
          ))}
          {uploading.map((slot) => (
            <li
              key={slot.id}
              className="flex h-32 w-32 items-center justify-center rounded-lg border border-dashed border-line bg-surface-muted text-center text-xs text-ink-soft"
            >
              Uploading…
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2">
        {attachmentLimits && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept={attachmentLimits.allowed_attachment_content_types.join(",")}
              disabled={remainingSlots <= 0}
              onChange={(event) => handleFileSelected(event.target.files)}
              className="hidden"
              id="message-attachment-input"
            />
            <Button
              type="button"
              variant="outline"
              className="shrink-0 px-2.5"
              disabled={remainingSlots <= 0}
              aria-label="Attach an image"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="size-4" aria-hidden="true" />
            </Button>
          </>
        )}
        {extraButton}
        <textarea
          aria-label={label}
          id="message-text"
          name="text"
          rows={1}
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={attachmentLimits?.max_message_length}
          onKeyDown={(event) => {
            // Enter sends, like every chat app; Shift+Enter still inserts a
            // newline for a multi-line message.
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          className={`${inputBase} max-h-32 flex-1 resize-none rounded-2xl`}
        />
        <Button className="shrink-0" disabled={!canSend} onClick={submit}>
          {isSending ? "Sending…" : submitLabel}
        </Button>
      </div>

      {attachmentError && (
        <p role="alert" className="text-xs text-accent-dark">
          {attachmentError}
        </p>
      )}

      {pendingFile && (
        <AttachmentCropModal
          file={pendingFile}
          onCancel={() => setPendingFile(null)}
          onConfirm={(cropped) => {
            setPendingFile(null);
            void uploadOne(cropped);
          }}
        />
      )}
    </div>
  );
}
