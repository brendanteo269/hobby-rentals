import "server-only";

import { backendRequest } from "@/lib/api/client";
import type { Conversation, Message } from "@/lib/conversations";

/** Mirrors the FastAPI routes in app/routers/conversations.py. */

export function getMyConversations() {
  return backendRequest<Conversation[]>("/conversations/mine");
}

export function getConversation(conversationId: string) {
  return backendRequest<Conversation>(`/conversations/${encodeURIComponent(conversationId)}`);
}

export function getMessages(conversationId: string) {
  return backendRequest<Message[]>(`/conversations/${encodeURIComponent(conversationId)}/messages`);
}

/** Opens (or reuses) the enquiry thread for a listing and sends its first message. */
export function sendListingMessage(listingId: string, text: string) {
  return backendRequest<Conversation>(`/conversations/listing/${encodeURIComponent(listingId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

/** Opens (or reuses) the thread for a booking and sends its first message. */
export function sendBookingMessage(bookingId: string, text: string) {
  return backendRequest<Conversation>(`/conversations/booking/${encodeURIComponent(bookingId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function sendMessage(conversationId: string, text: string) {
  return backendRequest<Message>(`/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function withdrawMessage(messageId: string) {
  return backendRequest<Message>(`/messages/${encodeURIComponent(messageId)}/withdraw`, {
    method: "PATCH",
  });
}
