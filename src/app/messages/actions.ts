"use server";

import { revalidatePath } from "next/cache";
import { getMessages, sendBookingMessage, sendListingMessage, sendMessage } from "@/lib/api/conversations";
import { acceptMeetup, proposeMeetup } from "@/lib/api/meetups";
import { BackendApiError } from "@/lib/api/client";
import { needsConfirmation, type Conversation, type Message, type MessagePage, type NeedsConfirmation } from "@/lib/conversations";

/** `confirmation`: the safety checks held the message (S4-15); nothing was sent. */
export type ConversationActionResult = { error: string } | { conversation: Conversation } | { confirmation: NeedsConfirmation };
export type MessageActionResult = { error: string } | { message: Message };
export type CheckedMessageActionResult = MessageActionResult | { confirmation: NeedsConfirmation };
export type MessagePageActionResult = { error: string } | MessagePage;

async function runConversation(action: () => Promise<Conversation | NeedsConfirmation>): Promise<ConversationActionResult> {
  try {
    const conversation = await action();
    if (needsConfirmation(conversation)) return { confirmation: conversation };
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
    // Deliberately not calling revalidatePath here. MessageComposer's onSent
    // appends the result to client state directly, so there's nothing left
    // that needs a server refetch - and revalidating *any* path inside a
    // Server Action makes the client wait for a background refresh of the
    // currently-viewed route before the action's own promise resolves, even
    // when the revalidated path is a different one. That wait was what kept
    // "Sending…" showing well after the message had already appeared:
    // /messages/[id] re-fetching its conversation, every message, and the
    // full conversations list for no reason anything was waiting on.
    // /messages (the list) fetches with no-store on every visit regardless,
    // so skipping this costs no real staleness.
    return { message };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
}

/** A reply goes through the safety checks (S4-15), so it may be held for confirmation instead of sent. */
async function runCheckedMessage(action: () => Promise<Message | NeedsConfirmation>): Promise<CheckedMessageActionResult> {
  try {
    const answer = await action();
    // As runMessage: no revalidatePath, the composer appends the sent message itself.
    return needsConfirmation(answer) ? { confirmation: answer } : { message: answer };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
}

export async function startListingConversation(listingId: string, text: string, attachmentKeys: string[] = [], confirmationId?: string) {
  return runConversation(() => sendListingMessage(listingId, text, attachmentKeys, confirmationId));
}

export async function startBookingConversation(bookingId: string, text: string, attachmentKeys: string[] = [], confirmationId?: string) {
  return runConversation(() => sendBookingMessage(bookingId, text, attachmentKeys, confirmationId));
}

export async function replyToConversation(conversationId: string, text: string, attachmentKeys: string[] = [], confirmationId?: string) {
  return runCheckedMessage(() => sendMessage(conversationId, text, attachmentKeys, confirmationId));
}

/** S2-16: the page of messages just before `before` (the oldest one already loaded), for a "load earlier messages" control. */
export async function loadEarlierMessages(conversationId: string, before: string): Promise<MessagePageActionResult> {
  try {
    return await getMessages(conversationId, before);
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
}

/** S2-19: propose (or re-propose) a meetup for a confirmed booking. */
export async function proposeBookingMeetup(bookingId: string, location: string, proposedTimes: string[]) {
  return runMessage(() => proposeMeetup(bookingId, location, proposedTimes));
}

/** S2-19: accept one of a meetup proposal's candidate times. */
export async function acceptBookingMeetup(proposalId: string, acceptedTime: string) {
  return runMessage(() => acceptMeetup(proposalId, acceptedTime));
}
