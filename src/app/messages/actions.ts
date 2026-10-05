"use server";

import { revalidatePath } from "next/cache";
import { sendBookingMessage, sendListingMessage, sendMessage, withdrawMessage } from "@/lib/api/conversations";
import { BackendApiError } from "@/lib/api/client";
import type { Conversation, Message } from "@/lib/conversations";

export type ConversationActionResult = { error: string } | { conversation: Conversation };
export type MessageActionResult = { error: string } | { message: Message };

async function runConversation(action: () => Promise<Conversation>): Promise<ConversationActionResult> {
  try {
    const conversation = await action();
    revalidatePath("/messages");
    revalidatePath(`/messages/${conversation.id}`);
    return { conversation };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
}

async function runMessage(action: () => Promise<Message>): Promise<MessageActionResult> {
  try {
    const message = await action();
    // Not revalidating the thread's own path: MessageComposer's onSent
    // appends the result to client state directly, so refetching the whole
    // page (conversation, every message, the full conversations list) here
    // would just be paying for a refetch nothing is waiting on. /messages
    // still revalidates so the list's last-message preview and ordering are
    // fresh next time it's actually visited.
    revalidatePath("/messages");
    return { message };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
}

export async function startListingConversation(listingId: string, text: string, attachmentKeys: string[] = []) {
  return runConversation(() => sendListingMessage(listingId, text, attachmentKeys));
}

export async function startBookingConversation(bookingId: string, text: string, attachmentKeys: string[] = []) {
  return runConversation(() => sendBookingMessage(bookingId, text, attachmentKeys));
}

export async function replyToConversation(conversationId: string, text: string, attachmentKeys: string[] = []) {
  return runMessage(() => sendMessage(conversationId, text, attachmentKeys));
}

export async function withdrawOwnMessage(messageId: string) {
  return runMessage(() => withdrawMessage(messageId));
}
