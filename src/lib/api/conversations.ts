import "server-only";

import { backendRequest } from "@/lib/api/client";
import type { Conversation, ConversationLimits, Message } from "@/lib/conversations";

/** Mirrors the FastAPI routes in app/routers/conversations.py. */

export { BackendApiError as ConversationApiError } from "@/lib/api/client";

export function getMyConversations() {
  return backendRequest<Conversation[]>("/conversations/mine");
}

export function getConversation(conversationId: string) {
  return backendRequest<Conversation>(`/conversations/${encodeURIComponent(conversationId)}`);
}

export function getMessages(conversationId: string) {
  return backendRequest<Message[]>(`/conversations/${encodeURIComponent(conversationId)}/messages`);
}

/** S2-17: server-enforced attachment type/size limits, for the composer to validate against before uploading. */
export function getConversationLimits() {
  return backendRequest<ConversationLimits>("/conversations/limits");
}

/** Opens (or reuses) the enquiry thread for a listing and sends its first message. */
export function sendListingMessage(listingId: string, text: string, attachmentKeys: string[] = []) {
  return backendRequest<Conversation>(`/conversations/listing/${encodeURIComponent(listingId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ text, attachment_keys: attachmentKeys }),
  });
}

/** Opens (or reuses) the thread for a booking and sends its first message. */
export function sendBookingMessage(bookingId: string, text: string, attachmentKeys: string[] = []) {
  return backendRequest<Conversation>(`/conversations/booking/${encodeURIComponent(bookingId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ text, attachment_keys: attachmentKeys }),
  });
}

export function sendMessage(conversationId: string, text: string, attachmentKeys: string[] = []) {
  return backendRequest<Message>(`/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ text, attachment_keys: attachmentKeys }),
  });
}

export function withdrawMessage(messageId: string) {
  return backendRequest<Message>(`/messages/${encodeURIComponent(messageId)}/withdraw`, {
    method: "PATCH",
  });
}

/** S2-17: issues a one-time S3 upload URL for a message attachment, mirroring presignListingPhoto. */
export function presignMessageAttachment(contentType: string) {
  return backendRequest<{ upload_url: string; attachment_key: string }>("/messages/attachments/presign", {
    method: "POST",
    body: JSON.stringify({ content_type: contentType }),
  });
}
