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

async function runMessage(conversationId: string, action: () => Promise<Message>): Promise<MessageActionResult> {
  try {
    const message = await action();
    revalidatePath("/messages");
    revalidatePath(`/messages/${conversationId}`);
    return { message };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
}

export async function startListingConversation(listingId: string, text: string) {
  return runConversation(() => sendListingMessage(listingId, text));
}

export async function startBookingConversation(bookingId: string, text: string) {
  return runConversation(() => sendBookingMessage(bookingId, text));
}

export async function replyToConversation(conversationId: string, text: string) {
  return runMessage(conversationId, () => sendMessage(conversationId, text));
}

export async function withdrawOwnMessage(conversationId: string, messageId: string) {
  return runMessage(conversationId, () => withdrawMessage(messageId));
}
