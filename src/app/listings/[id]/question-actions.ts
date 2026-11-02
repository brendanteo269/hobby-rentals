"use server";

import { revalidatePath } from "next/cache";
import { BackendApiError } from "@/lib/api/client";
import { answerListingQuestion, askAboutListing, forwardQuestion, setQuestionVisibility } from "@/lib/api/listing-questions";
import { needsConfirmation, type NeedsConfirmation } from "@/lib/conversations";
import type { ForwardedQuestion, InstantAnswer, OwnerQuestion } from "@/lib/listing-questions";

export type AskResult = { error: string } | { answer: InstantAnswer };
/** `confirmation`: the safety checks held the question (S4-15); nothing was sent. */
export type ForwardResult = { error: string } | { forwarded: ForwardedQuestion } | { confirmation: NeedsConfirmation };
export type OwnerAnswerResult = { error: string } | { question: OwnerQuestion } | { confirmation: NeedsConfirmation };
export type VisibilityResult = { error: string } | { question: OwnerQuestion };

function failure(error: unknown): { error: string } {
  if (error instanceof BackendApiError) return { error: error.message };
  throw error;
}

/** S5-07 Scenario 1: an instant answer from the listing's own data. */
export async function askQuestion(listingId: string, question: string): Promise<AskResult> {
  try {
    return { answer: await askAboutListing(listingId, question.trim()) };
  } catch (error) {
    return failure(error);
  }
}

/** Scenario 2: sends the question to the owner as a message in the renter's enquiry thread. */
export async function askOwner(listingId: string, question: string, confirmationId?: string): Promise<ForwardResult> {
  try {
    const result = await forwardQuestion(listingId, question.trim(), confirmationId);
    if (needsConfirmation(result)) return { confirmation: result };
    revalidatePath("/messages");
    return { forwarded: result };
  } catch (error) {
    return failure(error);
  }
}

/** Scenario 3: the owner answers; the renter gets it as a message, and the listing shows it if ticked. */
export async function answerQuestion(listingId: string, questionId: string, answer: string, showOnListing: boolean, confirmationId?: string): Promise<OwnerAnswerResult> {
  try {
    const result = await answerListingQuestion(questionId, answer.trim(), showOnListing, confirmationId);
    if (needsConfirmation(result)) return { confirmation: result };
    revalidatePath(`/listings/${listingId}`);
    return { question: result };
  } catch (error) {
    return failure(error);
  }
}

export async function changeQuestionVisibility(listingId: string, questionId: string, showOnListing: boolean): Promise<VisibilityResult> {
  try {
    const question = await setQuestionVisibility(questionId, showOnListing);
    revalidatePath(`/listings/${listingId}`);
    return { question };
  } catch (error) {
    return failure(error);
  }
}
